import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { gameRecords } from '@/storage/database/shared/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: '缺少用户ID' }, { status: 400 })
    }

    const records = await db
      .select()
      .from(gameRecords)
      .where(eq(gameRecords.userId, parseInt(userId)))
      .orderBy(desc(gameRecords.playedAt))
      .limit(50)

    return NextResponse.json({ records })
  } catch (error) {
    console.error('获取游戏记录失败:', error)
    return NextResponse.json({ error: '获取游戏记录失败' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, scenario, finalScore, result } = body

    if (!userId || !scenario || finalScore === undefined || !result) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    const [record] = await db
      .insert(gameRecords)
      .values({
        userId: parseInt(userId),
        scenario,
        finalScore,
        result,
      })
      .returning()

    return NextResponse.json({ success: true, record })
  } catch (error) {
    console.error('保存游戏记录失败:', error)
    return NextResponse.json({ error: '保存游戏记录失败' }, { status: 500 })
  }
}
