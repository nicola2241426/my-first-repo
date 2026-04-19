/**
 * 智谱 AI 错误分类与业务错误模型
 */

export type AiErrorCode =
  | 'UNAUTHORIZED'      // 401 - API Key 无效
  | 'FORBIDDEN'         // 403 - 权限不足
  | 'RATE_LIMITED'      // 429 - 限流
  | 'SERVER_ERROR'      // 5xx - 供应商服务端错误
  | 'TIMEOUT'           // 请求超时
  | 'PARSE_ERROR'       // 响应解析失败
  | 'UNKNOWN';          // 未知错误

export class AiError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    public readonly message: string,
    public readonly statusCode?: number,
    public readonly raw?: unknown,
  ) {
    super(message);
    this.name = 'AiError';
  }
}

/** 将 HTTP 状态码映射为业务错误码 */
export function classifyHttpError(status: number, body?: unknown): AiError {
  switch (true) {
    case status === 401:
      return new AiError('UNAUTHORIZED', 'API Key 无效或已过期', status, body);
    case status === 403:
      return new AiError('FORBIDDEN', 'API 权限不足', status, body);
    case status === 429:
      return new AiError('RATE_LIMITED', 'API 调用频率超限，请稍后重试', status, body);
    case status >= 500:
      return new AiError('SERVER_ERROR', `AI 服务端错误 (${status})，请稍后重试`, status, body);
    default:
      return new AiError('UNKNOWN', `未知错误 (${status})`, status, body);
  }
}

/** 将 AiError 转为前端可读的 HTTP 响应体 */
export function toApiErrorResponse(err: unknown): { error: string; code: string } {
  if (err instanceof AiError) {
    return { error: err.message, code: err.code };
  }
  if (err instanceof Error) {
    if (err.name === 'AbortError' || err.message.includes('timeout')) {
      return { error: 'AI 请求超时，请重试', code: 'TIMEOUT' };
    }
    return { error: err.message, code: 'UNKNOWN' };
  }
  return { error: '未知错误', code: 'UNKNOWN' };
}
