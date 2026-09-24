import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  // Supports single URL or comma-separated URLs for multi-port local dev
  CLIENT_URL: z
    .string()
    .default('http://localhost:3000,http://localhost:3001')
    .transform((val) => val.split(',').map((url) => url.trim())),

  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL is required for Prisma connection'),

  JWT_SECRET: z
    .string()
    .min(16, 'JWT_SECRET must be at least 16 characters for token signing security'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid or missing environment variables:');
  console.error(
    JSON.stringify(
      parsed.error.flatten().fieldErrors,
      null,
      2
    )
  );
  process.exit(1);
}

export const env = parsed.data;