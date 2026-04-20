/**
 * AI 调用可观测日志
 * 格式：[AI][provider][task] 状态 耗时ms
 */

export interface AiLogMeta {
  provider: string;
  task: string;
  model?: string;
}

export function logAiStart(meta: AiLogMeta): number {
  const ts = Date.now();
  console.log(`[AI][${meta.provider}][${meta.task}] 开始请求 model=${meta.model ?? '-'}`);
  return ts;
}

export function logAiSuccess(meta: AiLogMeta, startTs: number, extra?: Record<string, unknown>): void {
  const duration = Date.now() - startTs;
  console.log(
    `[AI][${meta.provider}][${meta.task}] 成功 耗时=${duration}ms`,
    extra ? JSON.stringify(extra) : '',
  );
}

export function logAiError(meta: AiLogMeta, startTs: number, err: unknown): void {
  const duration = Date.now() - startTs;
  const summary = err instanceof Error ? err.message : String(err);
  const raw =
    err && typeof err === 'object' && 'raw' in err
      ? (err as { raw: unknown }).raw
      : undefined;
  console.error(
    `[AI][${meta.provider}][${meta.task}] 失败 耗时=${duration}ms 错误="${summary}"`,
    raw ? `原始响应=${JSON.stringify(raw)}` : '',
  );
}
