/**
 * Cloudflare Turnstile 服务端校验
 * 文档: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileVerifyResult {
  success: boolean;
  errors?: string[];
}

export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteip?: string,
): Promise<TurnstileVerifyResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    throw new Error('TURNSTILE_SECRET_KEY 未配置');
  }
  if (!token) {
    return { success: false, errors: ['missing-token'] };
  }

  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    body,
  });

  const data = (await response.json()) as {
    success: boolean;
    'error-codes'?: string[];
  };

  return { success: data.success, errors: data['error-codes'] };
}
