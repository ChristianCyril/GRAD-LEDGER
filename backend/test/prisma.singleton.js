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

// Clear all data from the database (useful for test isolation)
export async function clearAllData() {
  const prisma = getPrismaClient();
  
  // Get all table names from Prisma schema
  const tables = Object.keys(prisma).filter(
    key => typeof prisma[key] === 'object' && 
           prisma[key]?.deleteMany && 
           key !== '$' 
  );

  // Delete all data in order respecting foreign keys
  try {
    // Delete in order of dependencies (reverse of creation order)
    await prisma.refreshToken.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.certificate.deleteMany({});
    await prisma.student.deleteMany({});
    await prisma.orgUser.deleteMany({});
    await prisma.organisation.deleteMany({});
    await prisma.superAdmin.deleteMany({});
  } catch (error) {
    console.warn('Error clearing data:', error.message);
  }
}
