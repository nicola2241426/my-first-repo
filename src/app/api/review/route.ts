import { NextRequest } from 'next/server';
import { callZhipuLLM } from '@/server/ai/zhipu-llm';
import { toApiErrorResponse } from '@/server/ai/errors';

interface ReviewRequest {
  scenario: {
    title: string;
    description: string;
  };
  currentWave: number;
  moodScore: number;
  roundReasons: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { scenario, currentWave, moodScore, roundReasons }: ReviewRequest =
      await request.json();

    const systemPrompt = `你是一个情感咨询师，正在对用户刚刚完成的一轮对话进行复盘分析。

**场景背景**：${scenario.description}

**当前状态**：
- 第 ${currentWave} 波段已结束
- 当前情绪值：${moodScore}/100
- 本波段3轮对话中，AI给出的判断理由如下：
${roundReasons.map((r, i) => `  第${i + 1}轮：${r}`).join('\n')}

**你的任务**：
1. 分析用户在这一波段的表现
2. 指出用户踩了哪些"雷"（减分的点）
3. 指出用户哪些回应加上了分
4. 总结整体情绪走势
5. 给出简短的建议（1-2句话）
6. 判断下一状态

**情绪值门槛规则**：
- 情绪值 ≥ 80：直接通关胜利
- 情绪值 ≥ 50：进入下一波段继续挑战
- 情绪值 < 50：继续下一波段，但需要更努力哄好

**复盘格式（必须严格遵循JSON格式，不要有任何多余文字）**：
\`\`\`json
{
  "summary": "本波段表现总结",
  "mistakes": ["踩雷点1", "踩雷点2"],
  "goodPoints": ["加分点1", "加分点2"],
  "advice": "简短建议",
  "nextStatus": "next_wave"
}
\`\`\`

**JSON 格式要求（重要）**：
- 所有数组即使为空也要写成 []，不要省略
- 不要在 JSON 外面加任何解释或说明
- nextStatus 只能是 "next_wave" 或 "won"
- 所有字段都是必填项

**要求**：
- 语气友好、有建设性
- 不要说教，要用"如果这样做会更好"的方式
- nextStatus 根据情绪值判断：≥80返回"won"，否则返回"next_wave"`;

    const llmResult = await callZhipuLLM(
      [{ role: 'system', content: systemPrompt }],
      { temperature: 0.7 },
      'review',
    );

    let parsedResponse;
    const content = llmResult.content;
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[1] || jsonMatch[0];
        jsonStr = jsonStr.replace(/:\s*\+(\d+)/g, ': $1');
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

        console.log('复盘 JSON:', jsonStr.substring(0, 200) + '...');
        parsedResponse = JSON.parse(jsonStr);

        if (
          !parsedResponse.summary ||
          !parsedResponse.mistakes ||
          !parsedResponse.goodPoints ||
          !parsedResponse.advice
        ) {
          throw new Error('缺少必需字段');
        }
      } catch (e) {
        console.error('JSON 解析失败:', e, '原始内容:', content);
        parsedResponse = {
          summary: '本波段已结束',
          mistakes: [],
          goodPoints: [],
          advice: '继续加油',
          nextStatus: moodScore >= 80 ? 'won' : 'next_wave',
        };
      }
    } else {
      parsedResponse = {
        summary: '本波段已结束',
        mistakes: [],
        goodPoints: [],
        advice: '继续加油',
        nextStatus: moodScore >= 80 ? 'won' : 'next_wave',
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...parsedResponse,
          nextStatus: moodScore >= 80 ? 'won' : 'next_wave',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('复盘处理失败:', error);
    const { error: msg, code } = toApiErrorResponse(error);
    return new Response(
      JSON.stringify({ success: false, error: msg, code }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
