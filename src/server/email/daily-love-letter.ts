/**
 * 每日情书：用智谱 LLM 生成一段温柔文字，再用 Resend 发送
 * 未来可由 cron / Vercel Cron 触发
 */
import { callZhipuLLM } from '@/server/ai/zhipu-llm';
import { sendEmail } from './client';
import { renderDailyLoveLetter } from './templates';

export interface SendDailyLoveLetterParams {
  to: string;
  username: string;
}

export interface SendDailyLoveLetterResult {
  ok: boolean;
  messageId?: string;
  body?: string;
  error?: string;
}

async function generateLoveLetterBody(username: string): Promise<string> {
  const { content } = await callZhipuLLM(
    [
      {
        role: 'system',
        content: `你是一位温柔细腻、有文学感的恋爱陪伴作者。你的任务是给收信人写一封 150~250 字的"每日情书"。
要求：
1. 语气温暖真诚，不油腻、不浮夸
2. 围绕日常细节、温柔关心、自我和解、彼此陪伴等主题
3. 纯正文，不加标题、不加 emoji、不加 Markdown
4. 2~3 段，段落之间用空行分隔
5. 结尾不要署名（署名由系统添加）`,
      },
      {
        role: 'user',
        content: `请写一封给 ${username} 的今日情书。`,
      },
    ],
    { temperature: 0.9, maxTokens: 600 },
    'daily-love-letter',
  );
  return content.trim();
}

export async function sendDailyLoveLetter(
  params: SendDailyLoveLetterParams,
): Promise<SendDailyLoveLetterResult> {
  try {
    const body = await generateLoveLetterBody(params.username);
    if (!body) return { ok: false, error: 'LLM 返回空内容' };

    const { subject, html, text } = renderDailyLoveLetter({
      username: params.username,
      body,
    });
    const { id } = await sendEmail({ to: params.to, subject, html, text });
    return { ok: true, messageId: id, body };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[Email][daily-love-letter] 失败 to=${params.to} 错误=${message}`,
    );
    return { ok: false, error: message };
  }
}
