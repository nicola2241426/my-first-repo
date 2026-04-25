/**
 * Cron - 准备今日情书
 *
 * 触发方：cron-job.org（建议每天 08:50 北京时间）
 * 行为：
 *   - 若今日情书已存在：直接返回（耗时 <100ms）
 *   - 若不存在：调用一次 LLM 生成并写入 daily_letters 表（耗时 ~12s）
 *
 * 返回 cached 字段标识本次是否命中缓存。
 *
 * ⚠️ Vercel Hobby 计划函数超时 10s。第一次执行可能因 LLM 慢而失败，
 *    建议在 cron-job.org 开启 "Notify on failure" + 手动重试一次。
 *    或者在 cron 调度上做"凌晨 1 点 + 早上 8 点"双触发兜底。
 */
import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/server/cron-auth'
import { getOrCreateTodayLetter } from '@/server/email/daily-letter-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function handle(request: NextRequest) {
  if (!verifyCronAuth(request)) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  const startedAt = Date.now()
  try {
    const letter = await getOrCreateTodayLetter()
    const duration = Date.now() - startedAt
    console.log(
      `[cron][prepare-letter] 完成 date=${letter.date} cached=${letter.cached} 耗时=${duration}ms`,
    )
    return NextResponse.json({
      ok: true,
      durationMs: duration,
      date: letter.date,
      cached: letter.cached,
      bodyPreview: letter.body.slice(0, 80),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[cron][prepare-letter] 失败 错误=${message}`)
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
