import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  // ─── Runtime ─────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  API_PREFIX: z.string().default('/api'),

  // ─── Database ────────────────────────────────────────────
  MONGODB_URI: z.string().min(1),

  // ─── URLs / CORS ─────────────────────────────────────────
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  // ─── JWT ─────────────────────────────────────────────────
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('30d'),

  // ─── Sessions ────────────────────────────────────────────
  REFRESH_TTL_MS: z.coerce.number().int().positive().default(30 * 24 * 60 * 60 * 1000),
  MAX_SESSIONS_PER_USER: z.coerce.number().int().positive().default(10),

  // ─── Rate limits ─────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(15 * 60 * 1000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(500),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),

  // ─── Media / SFU ─────────────────────────────────────────
  MEDIA_PROVIDER: z.string().default('livekit'),
  SFU_PROVIDER: z.string().default('livekit'),
  SFU_URL: z.string().optional().default(''),
  SFU_API_KEY: z.string().optional().default(''),
  SFU_API_SECRET: z.string().optional().default(''),

  // ─── LiveKit (primary) ───────────────────────────────────
  LIVEKIT_URL: z.string().optional().default(''),
  LIVEKIT_API_KEY: z.string().optional().default(''),
  LIVEKIT_API_SECRET: z.string().optional().default(''),

  // ─── Storage ─────────────────────────────────────────────
  STORAGE_ENDPOINT: z.string().optional().default(''),
  STORAGE_BUCKET: z.string().default('mitme'),
  STORAGE_ACCESS_KEY: z.string().optional().default(''),
  STORAGE_SECRET_KEY: z.string().optional().default(''),
  STORAGE_REGION: z.string().default('us-east-1'),

  // ─── Firebase ────────────────────────────────────────────
  FIREBASE_PROJECT_ID: z.string().optional().default(''),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(''),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(''),

  // ─── Google ──────────────────────────────────────────────
  GOOGLE_WEB_CLIENT_ID: z.string().optional().default(''),

  // ─── Messaging / OTP ─────────────────────────────────────
  OTP_PROVIDER: z.string().optional().default(''),
  EMAIL_PROVIDER: z.string().optional().default(''),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('[env] Invalid environment configuration:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
