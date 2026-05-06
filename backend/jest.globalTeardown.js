import { disconnectPrisma } from './test/prisma.singleton.js';

export default async function globalTeardown() {
  await disconnectPrisma();
}
