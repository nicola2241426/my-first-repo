import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    const [post] = await db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);

    if (!post) {
      return NextResponse.json(
        { error: "文章未找到" },
        { status: 404 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    console.error("获取文章详情失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `获取文章详情失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
