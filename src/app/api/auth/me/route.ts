import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const userId = request.cookies.get("user_id")?.value;
    const username = request.cookies.get("username")?.value;

    if (!userId || !username) {
      return NextResponse.json(
        { success: false, user: null },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: parseInt(userId),
        username,
      },
    });
  } catch (error) {
    console.error("检查登录状态失败:", error);
    return NextResponse.json(
      { success: false, user: null },
      { status: 500 }
    );
  }
}
