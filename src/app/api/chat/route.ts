import { NextRequest } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

interface ChatRequest {
  message: string;
  moodScore: number;
  currentWave: number;
  currentRound: number;
  scenario: {
    title: string;
    description: string;
    openingMessage: string;
  };
  conversationHistory: Array<{ role: string; content: string }>;
  playerGender: 'boyfriend' | 'girlfriend';
}

interface ChatResponse {
  success: boolean;
  data?: {
    reply: string;
    moodScore: number;
    moodChange: number;
    reason: string;
    waveStatus: 'continue' | 'review' | 'won' | 'lost';
  };
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      moodScore,
      currentWave,
      currentRound,
      scenario,
      conversationHistory,
      playerGender = 'boyfriend'
    }: ChatRequest = await request.json();

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // 判断是否需要波段结束总结
    const isWaveEnd = currentRound === 3;

    // 根据性别设置角色
    const roleDescription = playerGender === 'boyfriend' 
      ? '你现在扮演一个生气的女友角色' 
      : '你现在扮演一个生气的男友角色';

    // 构建系统提示词
    const systemPrompt = `${roleDescription}。场景背景：${scenario.description}

**游戏机制说明**：
- 当前情绪值：${moodScore}/100（0=非常生气，20=刚开始生气，50=平复，80=开心）
- 当前是第 ${currentWave} 波段，第 ${currentRound} 轮对话（每波段固定3轮）
- ${isWaveEnd ? '本轮是当前波段的最后一轮，本波段结束后将进行复盘' : ''}

**情绪值门槛规则**：
- 初始值：20
- 达到 50+：进入第二波段
- 达到 80+：通关胜利
- 降至 0：立即失败

**你的任务**：
1. 以生气女友的身份回应男友的话
2. 判断情绪值变化（-20 到 +20 之间），必须给出具体的判断理由
3. 根据对话质量判断游戏状态

**情绪值判断标准**：
- 如果男友道歉真诚、态度好，情绪值增加 5-15
- 如果男友敷衍、找借口，情绪值减少 5-10
- 如果男友说错话、激怒你，情绪值减少 10-20

**回应格式（必须严格遵循JSON格式，不要有任何多余文字）**：
\`\`\`json
{
  "reply": "女友的回应内容",
  "moodChange": 15,
  "reason": "判断理由（一句话说明）"
}
\`\`\`

**JSON 格式要求（重要）**：
- moodChange 必须是纯数字，正数不要加 + 号（直接写 15，不要写 +15）
- reply 不要包含任何格式标记
- reason 要简洁明了
- 所有字段都是必填项
- 不要在 JSON 外面加任何解释或说明

**对话风格**：
- 保持生气的女友人设
- 语气真实自然，有情绪起伏
- 适当使用感叹号和省略号
- 可以撒娇、抱怨、质问等，符合真实情侣对话
- reply 字段只包含对话内容，不要有任何格式标记

**重要提示**：
- 情绪值必须在 0-100 之间
- reason 字段必须简洁明确，用于复盘时向用户展示
- ${isWaveEnd ? '本轮结束后将进入复盘，请给出一个适合波段结束的回应' : ''}`;

    // 构建消息数组
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt }
    ];

    conversationHistory.forEach((msg) => {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({ role: msg.role, content: msg.content });
      }
    });

    messages.push({ role: 'user', content: message });

    // 调用 LLM
    const response = await client.invoke(messages, {
      model: 'doubao-seed-1-8-251228',
      temperature: 0.8,
      thinking: 'disabled',
      caching: 'disabled'
    });

    // 解析响应
    let parsedResponse;
    const content = response.content;

    // 尝试提取 JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      try {
        let jsonStr = jsonMatch[1] || jsonMatch[0];

        // 修复1：移除数字前面的 + 号（JSON 标准不支持）
        jsonStr = jsonStr.replace(/:\s*\+(\d+)/g, ': $1');

        // 修复2：修复尾随逗号（如 { "a": 1, }）
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

        // 修复3：修复未转义的引号
        jsonStr = jsonStr.replace(/"([^"]*)"/g, (match) => {
          if (match.includes('\\') && !match.includes('\\"')) {
            return match.replace(/"/g, '\\"');
          }
          return match;
        });

        console.log('尝试解析 JSON:', jsonStr.substring(0, 200) + '...');

        parsedResponse = JSON.parse(jsonStr);

        // 验证必需字段
        if (!parsedResponse.reply || parsedResponse.moodChange === undefined || !parsedResponse.reason) {
          throw new Error('缺少必需字段');
        }

        // 确保 moodChange 是数字
        parsedResponse.moodChange = Number(parsedResponse.moodChange);

      } catch (e) {
        console.error('JSON 解析失败:', e);
        console.error('原始内容:', content);
        console.error('提取的 JSON:', jsonMatch[1] || jsonMatch[0]);

        // 解析失败时的兜底逻辑
        parsedResponse = {
          reply: content,
          moodChange: 0,
          reason: 'AI 评分失败，已使用默认值'
        };
      }
    } else {
      parsedResponse = {
        reply: content,
        moodChange: 0,
        reason: 'AI 评分失败'
      };
    }

    // 计算新情绪值
    const newMoodScore = Math.max(0, Math.min(100, moodScore + parsedResponse.moodChange));

    // 判断游戏状态
    let waveStatus: 'continue' | 'review' | 'won' | 'lost' = 'continue';

    if (newMoodScore <= 0) {
      waveStatus = 'lost';
    } else if (newMoodScore >= 80) {
      waveStatus = 'won';
    } else if (currentRound === 3) {
      // 本波段结束，需要复盘
      waveStatus = 'review';
    }

    const responseData: ChatResponse = {
      success: true,
      data: {
        reply: parsedResponse.reply,
        moodScore: newMoodScore,
        moodChange: parsedResponse.moodChange,
        reason: parsedResponse.reason,
        waveStatus: waveStatus
      }
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('对话处理失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '对话处理失败'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
