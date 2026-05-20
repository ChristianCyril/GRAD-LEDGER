import { disconnectPrisma, clearAllData } from './test/prisma.singleton.js';

export default async function globalTeardown() {
  // Clear all test data before disconnecting
  await clearAllData();
  
  // Then disconnect
  await disconnectPrisma();
}
