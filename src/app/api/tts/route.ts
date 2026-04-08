import { NextRequest } from 'next/server';
import { TTSClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';

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
}

// 声音类型映射
const SPEAKER_MAP: Record<string, string> = {
  'gentle_female': 'zh_female_xiaohe_uranus_bigtts', // 温柔女声（推荐）
  'cool_female': 'zh_female_vv_uranus_bigtts', // 活泼女声
  'charming_female': 'zh_female_meilinvyou_saturn_bigtts', // 魅力御姐
  'deep_male': 'zh_male_taocheng_uranus_bigtts', // 低沉男声
  'gentle_male': 'zh_male_m191_uranus_bigtts', // 温柔男声
};

export async function POST(request: NextRequest) {
  try {
    const { text, speaker, moodScore }: TTSRequest = await request.json();

    if (!text || !speaker) {
      return new Response(
        JSON.stringify({
          success: false,
          error: '缺少必需参数'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new TTSClient(config, customHeaders);

    // 根据情绪值调整语音参数
    // 情绪值越低，语速越慢（生气时说话慢），情绪值越高，语速越快（开心时说话快）
    // 范围控制在 -20 到 30 之间，避免太极端
    const speechRate = Math.max(-20, Math.min(30, (moodScore - 50) * 1));

    // 音量调整：情绪低时音量稍低，情绪高时音量稍高
    // 范围控制在 -10 到 20 之间，保持自然
    const loudnessRate = Math.max(-10, Math.min(20, (moodScore - 50) * 0.8));

    console.log(`TTS请求: speaker=${speaker}, moodScore=${moodScore}, speechRate=${speechRate}, loudnessRate=${loudnessRate}`);

    const response = await client.synthesize({
      uid: 'user-' + Date.now(),
      text: text,
      speaker: SPEAKER_MAP[speaker] || SPEAKER_MAP['gentle_female'],
      audioFormat: 'mp3',
      sampleRate: 48000, // 提高采样率到48kHz，音质更好
      speechRate: speechRate,
      loudnessRate: loudnessRate
    });

    const responseData: TTSResponse = {
      success: true,
      data: {
        audioUri: response.audioUri,
        audioSize: response.audioSize
      }
    };

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('TTS生成失败:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: '语音生成失败'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
