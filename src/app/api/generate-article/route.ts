import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

export async function POST(request: NextRequest) {
  try {
    const { topic } = await request.json();

    if (!topic) {
      return NextResponse.json({ error: "请提供文章主题" }, { status: 400 });
    }

    // 调用 LLM 生成文章
    const config = new Config();
    const client = new LLMClient(config);

    const systemPrompt = `你是一个恋爱心理学专家和幽默的恋爱博主。你的写作风格轻松幽默、接地气，像朋友一样跟读者聊天。
请根据给定的主题写一篇 300-500 字的文章。

写作要求：
1. 标题要吸引人，用口语化的表达
2. 开头要引起共鸣，可以用"各位"或"兄弟姐妹们"
3. 内容要有实用建议，避免空洞的理论
4. 语言要轻松幽默，可以用一些网络用语和表情符号
5. 结尾要有行动号召或总结

格式要求：
- 标题单独一行
- 正文段落之间空一行
- 可以用简单的列表格式（1. 2. 3.）来列举要点`;

    const messages = [
      { role: "system" as const, content: systemPrompt },
      {
        role: "user" as const,
        content: `请以"${topic}"为主题，写一篇轻松幽默的恋爱建议文章，字数 300-500 字。`,
      },
    ];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.8,
    });

    // 解析响应，提取标题和内容
    const content = response.content.trim();
    const lines = content.split("\n");
    const title = lines[0].trim();
    const body = lines.slice(1).join("\n").trim();

    // 生成摘要（取前 100 字）
    const summary = body.slice(0, 100).trim() + (body.length > 100 ? "..." : "");

    // 生成 slug
    const slug = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 50);

    // 保存到数据库
    const supabase = getSupabaseClient();
    const { data: insertedData, error: insertError } = await supabase
      .from("blog_posts")
      .insert({
        title,
        slug,
        summary,
        content: body,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`保存到数据库失败: ${insertError.message}`);
    }

    return NextResponse.json({
      success: true,
      post: insertedData,
    });
  } catch (error) {
    console.error("生成文章失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `生成文章失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
