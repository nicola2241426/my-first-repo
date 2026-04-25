/**
 * 每日情书发送
 *
 * 注意：内容生成已迁移到 daily-letter-cache.ts。
 * 这里只负责"把已有的情书内容渲染成邮件并发出去"。
 *
 * 兼容旧调用方式：未传 body 时仍然实时调 LLM 生成，但不推荐。
 */
import { sendEmail } from './client'
import { renderDailyLoveLetter } from './templates'
import { generateLoveLetterBody } from './daily-letter-cache'

export interface SendDailyLoveLetterParams {
  to: string
  username: string
  /** 共享情书正文；不传则实时生成（慢，仅作降级） */
  body?: string
}

export interface SendDailyLoveLetterResult {
  ok: boolean
  messageId?: string
  body?: string
  error?: string
}

export async function sendDailyLoveLetter(
  params: SendDailyLoveLetterParams,
): Promise<SendDailyLoveLetterResult> {
  try {
    const body = params.body ?? (await generateLoveLetterBody())
    if (!body) return { ok: false, error: 'LLM 返回空内容' }

    const { subject, html, text } = renderDailyLoveLetter({
      username: params.username,
      body,
    })
    const { id } = await sendEmail({ to: params.to, subject, html, text })
    return { ok: true, messageId: id, body }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(
      `[Email][daily-love-letter] 失败 to=${params.to} 错误=${message}`,
    )
    return { ok: false, error: message }
  }
}
