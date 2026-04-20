import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gameRecords } from '@/storage/database/shared/schema';
import { callZhipuLLM } from '@/server/ai/zhipu-llm';
import { toApiErrorResponse } from '@/server/ai/errors';
import { putJsonObject, buildReportKey } from '@/server/cloudflare/r2';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reason?: string;
  moodChange?: number;
}

interface GenerateReportRequest {
  userId: number;
  recordId: number;
  scenario: { title: string; description: string };
  playerGender: 'boyfriend' | 'girlfriend';
  finalScore: number;
  result: 'won' | 'lost';
  messages: Message[];
}

interface ReportContent {
  overallScore: number;
  verdict: string;
  strengths: Array<{ title: string; detail: string }>;
  weaknesses: Array<{ title: string; detail: string }>;
  skillScores: {
    empathy: number;
    emotionManagement: number;
    communication: number;
    initiative: number;
  };
  advice: string[];
  quote: string;
}

function buildSystemPrompt(body: GenerateReportRequest): string {
  const partnerRole =
    body.playerGender === 'boyfriend' ? '女友' : '男友';
  const dialogueText = body.messages
    .map((m, i) => {
      const who = m.role === 'user' ? '玩家' : partnerRole;
      const extra = m.reason ? `  [判断: ${m.reason}]` : '';
      return `${i + 1}. ${who}: ${m.content}${extra}`;
    })
    .join('\n');

  return `你是一个资深情感咨询师，正在为用户刚完成的哄人游戏生成一份【恋爱解读报告】。

**游戏场景**: ${body.scenario.title}
**场景描述**: ${body.scenario.description}
**玩家角色**: ${body.playerGender === 'boyfriend' ? '男友（在哄女友）' : '女友（在哄男友）'}
**最终情绪值**: ${body.finalScore}/100
**游戏结果**: ${body.result === 'won' ? '成功哄好' : '未能哄好'}

**完整对话记录**:
${dialogueText}

**你的任务**:
基于整局对话，输出一份严谨、客观、建设性的恋爱解读报告。既要指出用户做得好的地方，更要清晰指出用户恋爱技巧的不足（核心诉求）。语气友好但不要廉价吹捧，给出的建议必须具体可执行。

**严格按以下 JSON 格式输出，不要有任何多余文字**：
\`\`\`json
{
  "overallScore": 65,
  "verdict": "整体评价，2-3 句，直接点出这局表现的核心特征",
  "strengths": [
    { "title": "优点标题（短）", "detail": "结合对话中具体例子说明" }
  ],
  "weaknesses": [
    { "title": "不足标题（短）", "detail": "结合对话中具体例子说明，并解释为什么不好" }
  ],
  "skillScores": {
    "empathy": 60,
    "emotionManagement": 40,
    "communication": 55,
    "initiative": 70
  },
  "advice": [
    "具体建议1，包含可执行的做法",
    "具体建议2"
  ],
  "quote": "一句话收尾，温暖或犀利皆可"
}
\`\`\`

**字段要求**:
- overallScore: 0-100 综合评分，不要只看 finalScore，要综合对话质量判断
- strengths: 2-3 条
- weaknesses: 2-3 条（**这是报告的核心，必须精准**）
- skillScores: 四个维度均为 0-100
  - empathy: 共情力
  - emotionManagement: 情绪管理
  - communication: 沟通技巧
  - initiative: 主动性
- advice: 2-3 条可执行的改进建议
- quote: 简短一句话

**严格要求**:
- 仅输出 JSON，不要有任何解释、寒暄、markdown 外壳之外的内容
- 所有数组即使只有 1 条也写成数组形式
- 所有字段都必填`;
}

function stripJson(content: string): string {
  const jsonMatch =
    content.match(/```json\s*([\s\S]*?)\s*```/) ||
    content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return content;
  let str = jsonMatch[1] || jsonMatch[0];
  str = str.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
  return str;
}

function isValidReport(data: unknown): data is ReportContent {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  return (
    typeof d.overallScore === 'number' &&
    typeof d.verdict === 'string' &&
    Array.isArray(d.strengths) &&
    Array.isArray(d.weaknesses) &&
    typeof d.skillScores === 'object' &&
    Array.isArray(d.advice) &&
    typeof d.quote === 'string'
  );
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateReportRequest = await request.json();

    if (!body.userId || !body.recordId || !body.messages?.length) {
      return NextResponse.json(
        { success: false, error: '缺少必要参数' },
        { status: 400 },
      );
    }

    const [record] = await db
      .select()
      .from(gameRecords)
      .where(eq(gameRecords.id, body.recordId))
      .limit(1);

    if (!record) {
      return NextResponse.json(
        { success: false, error: '游戏记录不存在' },
        { status: 404 },
      );
    }
    if (record.userId !== body.userId) {
      return NextResponse.json(
        { success: false, error: '无权操作该记录' },
        { status: 403 },
      );
    }

    if (record.reportKey) {
      return NextResponse.json(
        { success: false, error: '报告已生成，请从历史记录查看', code: 'ALREADY_GENERATED' },
        { status: 409 },
      );
    }

    const llm = await callZhipuLLM(
      [
        { role: 'system', content: buildSystemPrompt(body) },
        { role: 'user', content: '请基于以上对话生成恋爱解读报告，严格按 JSON 格式返回。' },
      ],
      { temperature: 0.7, maxTokens: 1500 },
      'report',
    );

    let report: ReportContent;
    try {
      const parsed = JSON.parse(stripJson(llm.content));
      if (!isValidReport(parsed)) {
        throw new Error('报告字段不完整');
      }
      report = parsed;
    } catch (e) {
      console.error('报告解析失败:', e, '原始内容:', llm.content);
      return NextResponse.json(
        { success: false, error: 'AI 返回内容解析失败，请重试' },
        { status: 502 },
      );
    }

    const key = buildReportKey(body.userId, body.recordId);
    await putJsonObject(key, {
      ...report,
      meta: {
        userId: body.userId,
        recordId: body.recordId,
        scenario: body.scenario.title,
        finalScore: body.finalScore,
        result: body.result,
        generatedAt: new Date().toISOString(),
      },
    });

    await db
      .update(gameRecords)
      .set({ reportKey: key })
      .where(eq(gameRecords.id, body.recordId));

    return NextResponse.json({
      success: true,
      data: { report, reportKey: key },
    });
  } catch (error) {
    console.error('生成报告失败:', error);
    const { error: msg, code } = toApiErrorResponse(error);
    return NextResponse.json(
      { success: false, error: msg, code },
      { status: 500 },
    );
  }
}
