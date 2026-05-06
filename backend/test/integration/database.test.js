import { PrismaClient } from '@prisma/client';
import { getPrismaClient } from '../prisma.singleton.js';

const prisma = getPrismaClient();

describe('Database Integration Tests', () => {
  let seededOrg;

  beforeEach(async () => {
    // Seed a test organisation directly using Prisma
    seededOrg = await prisma.organisation.create({
      data: {
        name: 'Test University',
        code: 'TST-UNI',
        type: 'UNIVERSITY',
        country: 'Cameroon',
        city: 'Douala',
        website: 'https://testuniv.cm',
        official_email: 'admin@testuniv.cm',
        phone: '+237000000000',
        address: '123 Test Street',
        status: 'APPROVED',
        doc_incorporation: 'https://res.cloudinary.com/demo/raw/upload/test.pdf',
        doc_letter_of_intent: 'https://res.cloudinary.com/demo/raw/upload/test.pdf',
        doc_accreditation: 'https://res.cloudinary.com/demo/raw/upload/test.pdf'
      }
    });
  });

  afterEach(async () => {
    // Delete the seeded organisation
    if (seededOrg?.id) {
      await prisma.organisation.delete({
        where: { id: seededOrg.id }
      });
    }
  });

  describe('Query by official_email', () => {
    it('should return the seeded organisation when querying by official_email', async () => {
      const result = await prisma.organisation.findUnique({
        where: { official_email: seededOrg.official_email }
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(seededOrg.id);
      expect(result.name).toBe('Test University');
      expect(result.code).toBe('TST-UNI');
      expect(result.official_email).toBe('admin@testuniv.cm');
    });
  });

  describe('Unique constraint on official_email', () => {
    it('should throw a unique constraint error when creating two organisations with the same official_email', async () => {
      await expect(
        prisma.organisation.create({
          data: {
            name: 'Another University',
            code: 'ANOTH-UNI',
            type: 'COLLEGE',
            country: 'Cameroon',
            city: 'Yaoundé',
            website: 'https://anotheruniv.cm',
            official_email: seededOrg.official_email, // Duplicate email
            phone: '+237111111111',
            address: '456 Another Street',
            status: 'PENDING'
          }
        })
      ).rejects.toThrow();
    });
  });
});
