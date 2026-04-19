import { NextRequest } from 'next/server';
import { callZhipuTTS, SPEAKER_MAP, moodToSpeechParams } from '@/server/ai/zhipu-tts';
import { toApiErrorResponse } from '@/server/ai/errors';
import type { ZhipuVoice } from '@/server/ai/zhipu-tts';

interface TTSRequest {
  text: string;
  speaker: string;
  moodScore: number;
}

interface TTSResponse {
  success: boolean;
  data?: {
    audioUri: string;
    audioSize: number;
  };
  error?: string;
  code?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text, speaker, moodScore }: TTSRequest = await request.json();

    if (!text || !speaker) {
      return new Response(
        JSON.stringify({ success: false, error: '缺少必需参数' } satisfies TTSResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const voice: ZhipuVoice = SPEAKER_MAP[speaker] ?? 'tongtong';
    const { speed, volume } = moodToSpeechParams(moodScore);

    console.log(
      `TTS请求: speaker=${speaker} → voice=${voice}, moodScore=${moodScore}, speed=${speed}, volume=${volume}`,
    );

    const result = await callZhipuTTS(text, { voice, speed, volume });

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          audioUri: result.audioDataUrl,
          audioSize: result.audioSize,
        },
      } satisfies TTSResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('TTS生成失败:', error);
    const { error: msg, code } = toApiErrorResponse(error);
    return new Response(
      JSON.stringify({ success: false, error: msg, code } satisfies TTSResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
