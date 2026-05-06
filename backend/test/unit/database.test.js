import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../prisma.singleton.js';

const prisma = getPrismaClient();

describe('Database Unit Tests', () => {
  describe('prisma.superAdmin.findMany()', () => {
    it('should resolve without throwing', async () => {
      const result = await prisma.superAdmin.findMany();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('prisma.organisation.findMany()', () => {
    it('should resolve without throwing', async () => {
      const result = await prisma.organisation.findMany();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('prisma.organisation.create()', () => {
    it('should throw a Prisma validation error when a required field is missing', async () => {
      // Attempting to create an organisation without the required 'code' field
      await expect(
        prisma.organisation.create({
          data: {
            name: 'Test Organisation',
            type: 'UNIVERSITY',
            country: 'Cameroon',
            city: 'Yaoundé',
            official_email: 'test@example.com',
            phone: '+237123456789',
            address: 'Test Address'
            // Missing required field: code
          }
        })
      ).rejects.toThrow();
    });
  });
});
