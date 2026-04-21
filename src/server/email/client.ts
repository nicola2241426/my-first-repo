/**
 * Resend 邮件客户端
 * 只允许在服务端使用。API Key 从环境变量读取。
 */
import { Resend } from 'resend';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必要的环境变量: ${name}`);
  }
  return value;
}

let cachedClient: Resend | null = null;

export function getResendClient(): Resend {
  if (!cachedClient) {
    cachedClient = new Resend(requireEnv('RESEND_API_KEY'));
  }
  return cachedClient;
}

/**
 * 默认发件人地址
 * 未验证域名前使用 Resend 提供的测试地址 onboarding@resend.dev
 * 未来验证域名后，改成类似 "哄哄模拟器 <noreply@yourdomain.com>"
 */
export const DEFAULT_FROM =
  process.env.RESEND_FROM || '哄哄模拟器 <onboarding@resend.dev>';

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SendEmailResult {
  id: string;
}

/**
 * 发送邮件。失败抛出 Error（含原始响应），由调用方决定是否忽略。
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  const client = getResendClient();
  const startedAt = Date.now();
  const { data, error } = await client.emails.send({
    from: DEFAULT_FROM,
    to: params.to,
    subject: params.subject,
    html: params.html,
    text: params.text,
  });
  const duration = Date.now() - startedAt;

  if (error) {
    console.error(
      `[Email] 发送失败 to=${params.to} 耗时=${duration}ms 错误=${JSON.stringify(error)}`,
    );
    const err = new Error(error.message || 'Resend 发送失败');
    (err as Error & { raw?: unknown }).raw = error;
    throw err;
  }

  const id = data?.id || '';
  console.log(
    `[Email] 发送成功 to=${params.to} id=${id} 耗时=${duration}ms`,
  );
  return { id };
}
