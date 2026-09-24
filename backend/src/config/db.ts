import { PrismaClient } from '@prisma/client';

const env = process.env as Record<string, string | undefined>;
const isDev = env.NODE_ENV === 'development';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: isDev ? ['error', 'warn'] : ['error'],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prismaGlobal: PrismaClientSingleton | undefined;
};

export const db = globalForPrisma.prismaGlobal ?? prismaClientSingleton();

if (env.NODE_ENV !== 'production') {
  globalForPrisma.prismaGlobal = db;
}

export const prisma = db;
export default db;