import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "退出登录成功",
    });

    // 清除所有认证相关的 cookie
    response.cookies.delete("user_id");
    response.cookies.delete("username");

    return response;
  } catch (error) {
    console.error("退出登录失败:", error);
    return NextResponse.json(
      { error: "退出登录失败" },
      { status: 500 }
    );
  }
}
