/**
 * Cloudflare R2 对象存储 — 服务端客户端
 *
 * R2 与 AWS S3 协议兼容，直接用 @aws-sdk/client-s3 即可。
 * 文档: https://developers.cloudflare.com/r2/api/s3/api/
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`缺少必要的环境变量: ${name}`);
  }
  return value;
}

let cachedClient: S3Client | null = null;

function getR2Client(): S3Client {
  if (cachedClient) return cachedClient;

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: requireEnv('R2_ENDPOINT'),
    credentials: {
      accessKeyId: requireEnv('R2_ACCESS_KEY_ID'),
      secretAccessKey: requireEnv('R2_SECRET_ACCESS_KEY'),
    },
  });
  return cachedClient;
}

function getBucket(): string {
  return requireEnv('R2_BUCKET');
}

/**
 * 把一个 JS 对象序列化为 JSON 并上传到 R2
 */
export async function putJsonObject(
  key: string,
  data: unknown,
): Promise<void> {
  const body = JSON.stringify(data);
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: body,
      ContentType: 'application/json; charset=utf-8',
    }),
  );
}

/**
 * 从 R2 下载 JSON 对象并反序列化
 */
export async function getJsonObject<T = unknown>(key: string): Promise<T> {
  const client = getR2Client();
  const res = await client.send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: key,
    }),
  );
  if (!res.Body) {
    throw new Error(`R2 对象为空: ${key}`);
  }
  const text = await res.Body.transformToString('utf-8');
  return JSON.parse(text) as T;
}

/**
 * 报告文件 key 规则（统一一处，避免前后端拼错）
 */
export function buildReportKey(userId: number, recordId: number): string {
  return `reports/${userId}/${recordId}.json`;
}
