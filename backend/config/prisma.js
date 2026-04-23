import { PrismaClient } from '@prisma/client';

const connectionString = process.env.NODE_ENV === 'test' 
  ? process.env.DATABASE_URL_TEST 
  : process.env.DATABASE_URL;

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

export default prisma;
