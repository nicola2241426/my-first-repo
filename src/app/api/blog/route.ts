import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { blogPosts } from "@/storage/database/shared/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        summary: blogPosts.summary,
        createdAt: blogPosts.createdAt,
      })
      .from(blogPosts)
      .orderBy(desc(blogPosts.createdAt));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("获取文章列表失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `获取文章列表失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
