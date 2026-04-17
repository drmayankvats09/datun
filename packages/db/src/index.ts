import { PrismaClient } from '@prisma/client';

// Singleton pattern — prevents multiple Prisma Client instances
// during Next.js hot reload in development.
// Google, Vercel, Prisma docs — all recommend this exact pattern.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Re-export everything from Prisma Client
// So consumers can do: import { prisma, User, Clinic } from "@repo/db"
export * from '@prisma/client';
export default prisma;
