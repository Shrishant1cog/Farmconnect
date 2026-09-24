import 'dotenv/config';
import { z } from 'zod';

const rawEnv = process.env as Record<string, string | undefined>;

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  CLIENT_URL: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((val) => val.split(',').map((url) => url.trim())),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required for database connectivity')
    .default(
      rawEnv.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/farmconnect?schema=public'
    ),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters for signing security')
    .default(rawEnv.JWT_SECRET || 'farmconnect-secret-key-development'),

  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CLIENT_EMAIL: z.string().optional(),
  FIREBASE_PRIVATE_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  FIREBASE_SERVICE_ACCOUNT_PATH: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid or missing environment configuration:');
  console.error(
    JSON.stringify(
      parsed.error.flatten().fieldErrors,
      null,
      2
    )
  );

  if (rawEnv.NODE_ENV === 'production') {
    process.exit(1);
  }
}

export const env: Env = parsed.success
  ? parsed.data
  : (envSchema.parse({
      ...process.env,
      DATABASE_URL:
        rawEnv.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/farmconnect?schema=public',
      JWT_SECRET:
        rawEnv.JWT_SECRET || 'farmconnect-secret-key-development',
    }) as Env);

export default env;