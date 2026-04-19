import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { verifyTurnstileToken } from "@/server/turnstile";

export async function POST(request: NextRequest) {
  try {
    const { username, password, turnstileToken } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "用户名和密码不能为空" },
        { status: 400 }
      );
    }

    const remoteip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      undefined;
    const verifyResult = await verifyTurnstileToken(turnstileToken, remoteip);
    if (!verifyResult.success) {
      console.warn("Turnstile 校验失败:", verifyResult.errors);
      return NextResponse.json(
        { error: "人机验证失败，请刷新后重试", code: "TURNSTILE_FAILED" },
        { status: 400 }
      );
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (!user) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "用户名或密码错误" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      message: "登录成功",
      user: { id: user.id, username: user.username },
    });

    response.cookies.set("user_id", String(user.id), {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      domain: undefined,
    });

    response.cookies.set("username", username, {
      httpOnly: false,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
      domain: undefined,
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
