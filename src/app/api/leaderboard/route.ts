import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { gameRecords, users } from '@/storage/database/shared/schema'
import { desc, eq } from 'drizzle-orm'

export async function GET() {
  try {
    const allRecords = await db
      .select({
        id: gameRecords.id,
        userId: gameRecords.userId,
        username: users.username,
        scenario: gameRecords.scenario,
        finalScore: gameRecords.finalScore,
        result: gameRecords.result,
        playedAt: gameRecords.playedAt,
      })
      .from(gameRecords)
      .leftJoin(users, eq(gameRecords.userId, users.id))
      .where(eq(gameRecords.result, 'won'))
      .orderBy(desc(gameRecords.finalScore))

    const userBestScores = new Map<number, typeof allRecords[0]>()
    for (const record of allRecords) {
      if (!userBestScores.has(record.userId)) {
        userBestScores.set(record.userId, record)
      }
    }

    const leaderboard = Array.from(userBestScores.values())
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, 20)
      .map((record, index) => ({
        rank: index + 1,
        userId: record.userId,
        username: record.username || '未知用户',
        score: record.finalScore,
        scenario: record.scenario,
        playedAt: record.playedAt,
      }))

    return NextResponse.json({ 
      success: true, 
      data: leaderboard 
    })
  } catch (error) {
    console.error('获取排行榜失败:', error)
    return NextResponse.json({ 
      success: false, 
      error: '获取排行榜失败' 
    }, { status: 500 })
  }
}
