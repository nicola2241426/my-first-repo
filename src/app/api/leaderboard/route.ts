import { NextRequest, NextResponse } from 'next/server'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import { gameRecords, users } from '@/storage/database/shared/schema'
import { desc, eq } from 'drizzle-orm'

const pool = new Pool({
  connectionString: process.env.COZE_DATABASE_URL,
})

const db = drizzle(pool)

// 获取排行榜数据
export async function GET(request: NextRequest) {
  try {
    // 查询每个用户的最高分记录
    // 使用子查询获取每个用户的最高分记录ID
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
      .where(eq(gameRecords.result, 'won')) // 只统计成功的游戏
      .orderBy(desc(gameRecords.finalScore))

    // 去重：每个用户只保留最高分的一条记录
    const userBestScores = new Map<number, typeof allRecords[0]>()
    for (const record of allRecords) {
      if (!userBestScores.has(record.userId)) {
        userBestScores.set(record.userId, record)
      }
    }

    // 转换为数组并排序
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
