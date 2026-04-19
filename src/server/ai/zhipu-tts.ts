/**
 * 智谱 AI — TTS 适配层
 * 端点：POST https://open.bigmodel.cn/api/paas/v4/audio/speech
 * 响应：二进制 WAV 音频，服务端转为 base64 data URL 返回前端
 */

import { zhipuConfig } from './config';
import { classifyHttpError, AiError } from './errors';
import { logAiStart, logAiSuccess, logAiError } from './logger';

export type ZhipuVoice =
  | 'tongtong'   // 彤彤（女，默认）
  | 'chuichui'   // 锤锤（男）
  | 'xiaochen'   // 小陈（男）
  | 'jam'
  | 'kazi'
  | 'douji'
  | 'luodo';

/**
 * 旧音色名（Coze）→ 智谱音色映射
 */
export const SPEAKER_MAP: Record<string, ZhipuVoice> = {
  gentle_female:   'tongtong',
  cool_female:     'tongtong',
  charming_female: 'tongtong',
  deep_male:       'chuichui',
  gentle_male:     'xiaochen',
};

export interface TTSOptions {
  voice?: ZhipuVoice;
  /** 语速 0.5-2.0，默认 1.0 */
  speed?: number;
  /** 音量 0-10，默认 1.0 */
  volume?: number;
}

export interface TTSResult {
  /** base64 data URL，可直接用于 <audio src="..."> */
  audioDataUrl: string;
  audioSize: number;
}

export async function callZhipuTTS(text: string, options: TTSOptions = {}): Promise<TTSResult> {
  const { apiKey, baseUrl, ttsModel, timeoutMs } = zhipuConfig;
  const meta = { provider: 'zhipu', task: 'tts', model: ttsModel };
  const startTs = logAiStart(meta);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${baseUrl}/audio/speech`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: ttsModel,
        input: text.slice(0, 1024),
        voice: options.voice ?? 'tongtong',
        response_format: 'wav',
        speed: options.speed ?? 1.0,
        volume: options.volume ?? 1.0,
      }),
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      const err = classifyHttpError(res.status, body);
      logAiError(meta, startTs, err);
      throw err;
    }

    const arrayBuffer = await res.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const audioDataUrl = `data:audio/wav;base64,${base64}`;

    logAiSuccess(meta, startTs, { audioSize: arrayBuffer.byteLength });

    return {
      audioDataUrl,
      audioSize: arrayBuffer.byteLength,
    };
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

/**
 * 根据情绪值计算智谱语速和音量
 * 情绪越低（生气）语速慢；情绪越高语速快
 */
export function moodToSpeechParams(moodScore: number): { speed: number; volume: number } {
  // moodScore: 0-100，中值50对应默认
  // speed: 0.8（低情绪）到 1.3（高情绪）
  const speed = parseFloat((0.8 + (moodScore / 100) * 0.5).toFixed(2));
  // volume: 0.8 到 1.5
  const volume = parseFloat((0.8 + (moodScore / 100) * 0.7).toFixed(2));
  return {
    speed: Math.max(0.5, Math.min(2.0, speed)),
    volume: Math.max(0.5, Math.min(2.0, volume)),
  };
}
