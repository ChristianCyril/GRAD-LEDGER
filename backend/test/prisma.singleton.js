import { PrismaClient } from '@prisma/client';

let prismaInstance;

export function getPrismaClient() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      // Suppress logs during tests
      log: process.env.DEBUG ? ['query', 'info', 'warn', 'error'] : []
    });
  }
  return prismaInstance;
}

export async function disconnectPrisma() {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    prismaInstance = null;
  }
}
