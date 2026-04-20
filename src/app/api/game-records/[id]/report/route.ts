import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { gameRecords } from '@/storage/database/shared/schema';
import { getJsonObject } from '@/server/cloudflare/r2';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const recordId = parseInt(id, 10);
    if (!Number.isFinite(recordId)) {
      return NextResponse.json({ error: '无效的记录 ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const userIdParam = searchParams.get('userId');
    if (!userIdParam) {
      return NextResponse.json({ error: '缺少用户 ID' }, { status: 400 });
    }
    const userId = parseInt(userIdParam, 10);

    const [record] = await db
      .select()
      .from(gameRecords)
      .where(eq(gameRecords.id, recordId))
      .limit(1);

    if (!record) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }
    if (record.userId !== userId) {
      return NextResponse.json({ error: '无权查看该记录' }, { status: 403 });
    }
    if (!record.reportKey) {
      return NextResponse.json(
        { error: '该场游戏尚未生成报告', code: 'NOT_GENERATED' },
        { status: 404 },
      );
    }

    const report = await getJsonObject(record.reportKey);
    return NextResponse.json({ success: true, data: { report } });
  } catch (error) {
    console.error('获取报告失败:', error);
    return NextResponse.json(
      { error: '获取报告失败，请稍后重试' },
      { status: 500 },
    );
  }
}
