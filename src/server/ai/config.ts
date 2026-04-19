/**
 * 智谱 AI 服务端配置
 * API Key 只从服务端环境变量读取，禁止前端暴露
 */

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必要的环境变量: ${name}`);
  }
  return value;
}

export const zhipuConfig = {
  get apiKey(): string {
    return requireEnv('ZHIPU_API_KEY');
  },
  baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
  /** 聊天/复盘/文章生成使用的模型 */
  llmModel: 'glm-4-flash',
  /** TTS 模型 */
  ttsModel: 'glm-tts',
  /** HTTP 请求超时（毫秒） */
  timeoutMs: 30_000,
};
