import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { getSupabaseClient } from "@/storage/database/supabase-client";

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

    const client = getSupabaseClient();

    // 查找用户
    const { data: user, error: selectError } = await client
      .from("users")
      .select("*")
      .eq("username", username)
      .maybeSingle();

    if (selectError) {
      throw new Error(`查询用户失败: ${selectError.message}`);
    }

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    // 设置会话 cookie
    const response = NextResponse.json({
      success: true,
      message: "登录成功",
      user: {
        id: user.id,
        username: user.username,
      },
    });

    response.cookies.set("user_id", String(user.id), {
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
    console.error("登录失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `登录失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
