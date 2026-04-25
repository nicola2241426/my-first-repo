/**
 * 每日情书的"内容缓存"
 *
 * 设计：
 *   一天只生成 1 封情书（共享给所有用户），存到 daily_letters 表。
 *   prepare cron 负责生成并缓存；send cron 只负责读取并发送。
 *
 *   日期以 Asia/Shanghai 时区为准，用 'YYYY-MM-DD' 作为 unique key。
 */
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { dailyLetters } from '@/storage/database/shared/schema'
import { callZhipuLLM } from '@/server/ai/zhipu-llm'

/**
 * 返回北京时间今天的 'YYYY-MM-DD'
 * 不依赖 process.env.TZ，避免 Vercel 默认 UTC 导致跨时区出错
 */
export function getTodayDateInShanghai(): string {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return fmt.format(new Date())
}

/**
 * 调 LLM 生成一封"通用"情书（不带收件人姓名，由模板拼接）
 */
export async function generateLoveLetterBody(): Promise<string> {
  const { content } = await callZhipuLLM(
    [
      {
        role: 'system',
        content: `你是一位温柔细腻、有文学感的恋爱陪伴作者。请写一封 150~250 字的"每日情书"。
要求：
1. 语气温暖真诚，不油腻、不浮夸
2. 围绕日常细节、温柔关心、自我和解、彼此陪伴等主题
3. 纯正文，不加标题、不加 emoji、不加 Markdown
4. 2~3 段，段落之间用空行分隔
5. 不要写抬头（如"亲爱的 xx"），不要写署名（系统会拼接）
6. 内容应能通用地送给任何收件人，避免出现具体姓名或称呼`,
      },
      {
        role: 'user',
        content: `请写今日的情书。`,
      },
    ],
    { temperature: 0.9, maxTokens: 600 },
    'daily-love-letter',
  )
  return content.trim()
}

export interface TodayLetter {
  date: string
  body: string
  cached: boolean
}

/**
 * 取今天的情书；不存在则返回 null
 */
export async function getTodayLetter(): Promise<TodayLetter | null> {
  const date = getTodayDateInShanghai()
  const rows = await db
    .select({ body: dailyLetters.body })
    .from(dailyLetters)
    .where(eq(dailyLetters.date, date))
    .limit(1)
  if (rows.length === 0) return null
  return { date, body: rows[0].body, cached: true }
}

/**
 * 取今天的情书；不存在则生成并存入。幂等。
 */
export async function getOrCreateTodayLetter(): Promise<TodayLetter> {
  const existing = await getTodayLetter()
  if (existing) return existing

  const date = getTodayDateInShanghai()
  const body = await generateLoveLetterBody()
  if (!body) throw new Error('LLM 返回空内容')

  // 用 ON CONFLICT DO NOTHING 防止并发触发时重复插入
  const inserted = await db
    .insert(dailyLetters)
    .values({ date, body })
    .onConflictDoNothing({ target: dailyLetters.date })
    .returning({ body: dailyLetters.body })

  if (inserted.length > 0) {
    return { date, body: inserted[0].body, cached: false }
  }
  // 走到这里说明被并发插入抢了，重新查一次
  const fallback = await getTodayLetter()
  if (!fallback) throw new Error('生成后查询不到今日情书')
  return fallback
}
