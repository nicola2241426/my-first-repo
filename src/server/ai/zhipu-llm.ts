/**
 * 智谱 AI — Chat Completions 适配层
 * 端点：POST https://open.bigmodel.cn/api/paas/v4/chat/completions
 */

import { zhipuConfig } from './config';
import { classifyHttpError, AiError } from './errors';
import { logAiStart, logAiSuccess, logAiError } from './logger';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMResult {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface ZhipuChatResponse {
  id: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function callZhipuLLM(
  messages: LLMMessage[],
  options: LLMOptions = {},
  task = 'llm',
): Promise<LLMResult> {
  const { apiKey, baseUrl, llmModel, timeoutMs } = zhipuConfig;
  const model = options.model ?? llmModel;
  const meta = { provider: 'zhipu', task, model };
  const startTs = logAiStart(meta);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.maxTokens ?? 1024,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const err = classifyHttpError(res.status, body);
      logAiError(meta, startTs, err);
      throw err;
    }

    const data: ZhipuChatResponse = await res.json();
    const content = data.choices?.[0]?.message?.content ?? '';

    const result: LLMResult = {
      content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };

    logAiSuccess(meta, startTs, {
      totalTokens: result.usage?.totalTokens,
      finishReason: data.choices?.[0]?.finish_reason,
    });

    return result;
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof AiError) throw err;
    logAiError(meta, startTs, err);
    throw new AiError(
      err instanceof Error && err.name === 'AbortError' ? 'TIMEOUT' : 'UNKNOWN',
      err instanceof Error ? err.message : '未知错误',
      undefined,
      err,
    );
  }
}
