/**
 * 欢迎邮件：注册成功后调用
 * 发送失败不会抛异常，避免影响注册主流程
 */
import { sendEmail } from './client';
import { renderWelcomeEmail } from './templates';

export async function sendWelcomeEmail(params: {
  to: string;
  username: string;
}): Promise<void> {
  try {
    const { subject, html, text } = renderWelcomeEmail({
      username: params.username,
    });
    await sendEmail({ to: params.to, subject, html, text });
  } catch (err) {
    // 注册主流程不应因邮件失败而中断，这里只记录日志
    console.error(
      `[Email][welcome] 发送欢迎信失败 to=${params.to}`,
      err instanceof Error ? err.message : err,
    );
  }
}
