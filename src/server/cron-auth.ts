/**
 * Cron 接口的统一鉴权
 *
 * 通过 Authorization: Bearer <CRON_SECRET> 校验，
 * 也支持 ?secret=xxx 兜底（不推荐，仅供调试）。
 *
 * 若环境未配置 CRON_SECRET，则放行并打印警告（仅本地开发用）。
 */
import type { NextRequest } from 'next/server'

export function verifyCronAuth(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.warn(
      '[cron] 未配置 CRON_SECRET，任何人都能触发 cron 接口（仅本地开发可接受）',
    )
    return true
  }
  const header = request.headers.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (token && token === secret) return true
  const queryToken = request.nextUrl.searchParams.get('secret')
  return queryToken === secret
}
