import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { db } from "@/lib/db";
import { users } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import { verifyTurnstileToken } from "@/server/turnstile";
import { sendWelcomeEmail } from "@/server/email/welcome";

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const { username, password, email, turnstileToken } = await request.json();

    if (!username || !password || !email) {
      return NextResponse.json(
        { error: "用户名、密码、邮箱都不能为空" },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(String(email))) {
      return NextResponse.json(
        { error: "邮箱格式不正确" },
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

    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUser) {
      return NextResponse.json(
        { error: "用户名已存在" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const [newUser] = await db
      .insert(users)
      .values({ username, password: hashedPassword, email })
      .returning({ id: users.id, username: users.username, email: users.email });

    // 异步发欢迎邮件，失败不影响注册主流程
    void sendWelcomeEmail({ to: email, username });

    const response = NextResponse.json({
      success: true,
      message: "注册成功",
      user: { id: newUser.id, username: newUser.username },
    });

    response.cookies.set("user_id", String(newUser.id), {
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
    console.error("注册失败:", error);
    const errorMessage = error instanceof Error ? error.message : "未知错误";
    return NextResponse.json(
      { error: `注册失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}
