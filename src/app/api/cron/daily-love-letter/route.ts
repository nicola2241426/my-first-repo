/**
 * 每日情书定时任务
 *
 * 触发方:cron-job.org(或任何外部定时调用方)
 * 推荐配置:每天北京时间 09:00 触发一次
 *
 * 请求头必须包含 Authorization: Bearer <CRON_SECRET>
 * 若环境变量未配置 CRON_SECRET,则不做鉴权(仅建议在本地开发使用)
 *
 * 支持 GET / POST(cron-job.org 默认用 GET);
 * 支持 ?limit=N 调试参数,只给前 N 个用户发,便于自测
 */
import { NextRequest, NextResponse } from 'next/server'
import { isNotNull } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/storage/database/shared/schema'
import { sendDailyLoveLetter } from '@/server/email/daily-love-letter'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CONCURRENCY = 3

interface ItemResult {
  userId: number
  username: string
  email: string
  ok: boolean
  messageId?: string
  error?: string
}

function verifyAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn(
      '[cron][daily-love-letter] 未配置 CRON_SECRET,任何人都能触发此接口',
    )
    return true
  }
  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (token && token === secret) return true
  const queryToken = request.nextUrl.searchParams.get('secret')
  return queryToken === secret
}

async function runJob(limit?: number) {
  const rows = await db
    .select({
      id: users.id,
      username: users.username,
      email: users.email,
    })
    .from(users)
    .where(isNotNull(users.email))

  const targets = rows.filter(
    (u): u is { id: number; username: string; email: string } => !!u.email,
  )
  const picked = typeof limit === 'number' ? targets.slice(0, limit) : targets

  const results: ItemResult[] = []

  for (let i = 0; i < picked.length; i += CONCURRENCY) {
    const chunk = picked.slice(i, i + CONCURRENCY)
    const settled = await Promise.allSettled(
      chunk.map((u) =>
        sendDailyLoveLetter({ to: u.email, username: u.username }),
      ),
    )
    settled.forEach((r, idx) => {
      const user = chunk[idx]
      if (r.status === 'fulfilled' && r.value.ok) {
        results.push({
          userId: user.id,
          username: user.username,
          email: user.email,
          ok: true,
          messageId: r.value.messageId,
        })
      } else {
        const error =
          r.status === 'fulfilled'
            ? r.value.error || '未知错误'
            : r.reason instanceof Error
              ? r.reason.message
              : String(r.reason)
        results.push({
          userId: user.id,
          username: user.username,
          email: user.email,
          ok: false,
          error,
        })
      }
    })
  }

  const summary = {
    total: results.length,
    success: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
  }
  return { summary, results }
}

async function handle(request: NextRequest) {
  if (!verifyAuth(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = limitParam ? Math.max(0, Number(limitParam)) : undefined

  const startedAt = Date.now()
  try {
    const { summary, results } = await runJob(limit)
    const duration = Date.now() - startedAt
    console.log(
      `[cron][daily-love-letter] 完成 total=${summary.total} success=${summary.success} failed=${summary.failed} 耗时=${duration}ms`,
    )
    return NextResponse.json({
      ok: true,
      durationMs: duration,
      summary,
      results,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[cron][daily-love-letter] 任务失败 错误=${message}`)
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    )
  }
}

export async function GET(request: NextRequest) {
  return handle(request)
}

export async function POST(request: NextRequest) {
  return handle(request)
}
