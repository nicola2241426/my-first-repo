import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getSupabaseClient } from "@/storage/database/supabase-client";

const SALT_ROUNDS = 10;

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    // 验证输入
    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    if (username.length < 3) {
      return NextResponse.json(
        { error: "用户名至少需要 3 个字符" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "密码至少需要 6 个字符" },
        { status: 400 }
      );
    }

    const client = getSupabaseClient();

    // 检查用户名是否已存在
    const { data: existingUser, error: checkError } = await client
      .from("users")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (checkError) {
      throw new Error(`查询用户失败: ${checkError.message}`);
    }

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 409 }
      );
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 创建用户
    const { data: newUser, error: insertError } = await client
      .from("users")
      .insert({
        username,
        password: hashedPassword,
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`创建用户失败: ${insertError.message}`);
    }

    // 设置会话 cookie
    const response = NextResponse.json({
      success: true,
      message: "注册成功",
      user: {
        id: newUser.id,
        username: newUser.username,
      },
    });

    response.cookies.set("user_id", String(newUser.id), {
      httpOnly: false, // 改为非 httpOnly 以提高兼容性
      secure: false, // 沙箱环境兼容
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: "/",
      domain: undefined, // 自动使用当前域名
    });

    response.cookies.set("username", username, {
      httpOnly: false,
      secure: false, // 沙箱环境兼容
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 天
      path: "/",
      domain: undefined, // 自动使用当前域名
    });

    return response;
  } catch (error) {
    console.error("注册失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `注册失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
