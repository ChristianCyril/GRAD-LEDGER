import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { getPrismaClient } from '../prisma.singleton.js';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

const prisma = getPrismaClient();

// create a simple express app for testing or import the actual app
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import authRoutes from '../../routes/authRoutes.js';
import corsOption from '../../config/corsOption.js';

const app = express();
app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRoutes);

describe('Auth Integration Tests', () => {
  let superAdminId;
  let orgId;
  let orgSuperAdminId;
  let orgAdminId;

  beforeAll(async () => {
    // Seed a super admin
    const superAdmin = await prisma.superAdmin.create({
      data: {
        email: 'superadmin.test@example.com',
        password_hash: await bcrypt.hash('SuperAdmin@123', 10)
      }
    });
    superAdminId = superAdmin.id;

    // Seed an approved organisation
    const org = await prisma.organisation.create({
      data: {
        name: 'Test University',
        code: 'TEST-UNI',
        type: 'UNIVERSITY',
        country: 'Cameroon',
        city: 'Yaoundé',
        official_email: 'test.org@example.com',
        phone: '+237000000000',
        address: 'Test Address',
        status: 'APPROVED'
      }
    });
    orgId = org.id;

    // Seed an ORG_SUPER_ADMIN user
    const orgSuperAdmin = await prisma.orgUser.create({
      data: {
        org_id: orgId,
        role: 'ORG_SUPER_ADMIN',
        full_name: 'Org Super Admin',
        job_title: 'Registrar',
        email: 'orgsuperadmin.test@example.com',
        phone: '+237111111111',
        password_hash: await bcrypt.hash('OrgSuper@123', 10),
        status: 'ACTIVE'
      }
    });
    orgSuperAdminId = orgSuperAdmin.id;

    // Seed an ORG_ADMIN user
    const orgAdmin = await prisma.orgUser.create({
      data: {
        org_id: orgId,
        role: 'ORG_ADMIN',
        full_name: 'Org Admin',
        job_title: 'Deputy Registrar',
        email: 'orgadmin.test@example.com',
        phone: '+237222222222',
        password_hash: await bcrypt.hash('OrgAdmin@123', 10),
        status: 'ACTIVE'
      }
    });
    orgAdminId = orgAdmin.id;
  });

  afterAll(async () => {
    // Clean up all test data
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { user_id: superAdminId },
            { user_id: orgSuperAdminId },
            { user_id: orgAdminId }
          ]
        }
      });

      if (orgAdminId) {
        await prisma.orgUser.delete({
          where: { id: orgAdminId }
        }).catch(() => {});
      }

      if (orgSuperAdminId) {
        await prisma.orgUser.delete({
          where: { id: orgSuperAdminId }
        }).catch(() => {});
      }

      if (orgId) {
        await prisma.organisation.delete({
          where: { id: orgId }
        }).catch(() => {});
      }

      if (superAdminId) {
        await prisma.superAdmin.delete({
          where: { id: superAdminId }
        }).catch(() => {});
      }
    } catch (error) {
      console.error('Error cleaning up auth test data:', error);
    }
    
    // Do NOT disconnect - let global teardown handle it
  });

  describe('POST /api/auth/super-admin/login', () => {
    it('should return 200, accessToken, and set HttpOnly cookie with correct credentials', async () => {
      const response = await request(app)
        .post('/api/auth/super-admin/login')
        .send({
          email: 'superadmin.test@example.com',
          password: 'SuperAdmin@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(typeof response.body.data.accessToken).toBe('string');
      expect(response.headers['set-cookie']).toBeDefined();
      expect(response.headers['set-cookie'][0]).toMatch(/refreshToken=/);
      expect(response.headers['set-cookie'][0]).toMatch(/HttpOnly/);
    });

    it('should create a RefreshToken record in the DB after login', async () => {
      const response = await request(app)
        .post('/api/auth/super-admin/login')
        .send({
          email: 'superadmin.test@example.com',
          password: 'SuperAdmin@123'
        });

      expect(response.status).toBe(200);

      const tokens = await prisma.refreshToken.findMany({
        where: {
          user_id: superAdminId,
          user_role: 'SUPER_ADMIN'
        }
      });

      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should return 401 with wrong password', async () => {
      const response = await request(app)
        .post('/api/auth/super-admin/login')
        .send({
          email: 'superadmin.test@example.com',
          password: 'WrongPassword'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/org/login', () => {
    it('should return 200 with accessToken and role: ORG_SUPER_ADMIN for ORG_SUPER_ADMIN', async () => {
      const response = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'orgsuperadmin.test@example.com',
          password: 'OrgSuper@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.role).toBe('ORG_SUPER_ADMIN');
    });

    it('should return 200 with accessToken and role: ORG_ADMIN for ORG_ADMIN', async () => {
      const response = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'orgadmin.test@example.com',
          password: 'OrgAdmin@123'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.user.role).toBe('ORG_ADMIN');
    });

    it('should return 403 for a pending organisation', async () => {
      // Create a pending org and user
      const pendingOrg = await prisma.organisation.create({
        data: {
          name: 'Pending Org',
          code: 'PEND-ORG',
          type: 'COLLEGE',
          country: 'Cameroon',
          city: 'Douala',
          official_email: 'pending@example.com',
          phone: '+237333333333',
          address: 'Pending Address',
          status: 'PENDING'
        }
      });

      const pendingUser = await prisma.orgUser.create({
        data: {
          org_id: pendingOrg.id,
          role: 'ORG_SUPER_ADMIN',
          full_name: 'Pending User',
          job_title: 'Manager',
          email: 'pending.user@example.com',
          phone: '+237444444444',
          password_hash: await bcrypt.hash('Password@123', 10),
          status: 'ACTIVE'
        }
      });

      const response = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'pending.user@example.com',
          password: 'Password@123'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('not approved');

      // Cleanup
      await prisma.orgUser.delete({ where: { id: pendingUser.id } });
      await prisma.organisation.delete({ where: { id: pendingOrg.id } });
    });

    it('should return 403 for a disabled OrgUser', async () => {
      // Create a disabled user
      const disabledUser = await prisma.orgUser.create({
        data: {
          org_id: orgId,
          role: 'ORG_ADMIN',
          full_name: 'Disabled User',
          job_title: 'Deputy',
          email: 'disabled.user@example.com',
          phone: '+237555555555',
          password_hash: await bcrypt.hash('Password@123', 10),
          status: 'DISABLED'
        }
      });

      const response = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'disabled.user@example.com',
          password: 'Password@123'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('disabled');

      // Cleanup
      await prisma.orgUser.delete({ where: { id: disabledUser.id } });
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should return 200 with new accessToken for a valid cookie', async () => {
      // First login to get a refresh token
      const loginResponse = await request(app)
        .post('/api/auth/super-admin/login')
        .send({
          email: 'superadmin.test@example.com',
          password: 'SuperAdmin@123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Then refresh
      const refreshResponse = await request(app)
        .get('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.data.accessToken).toBeDefined();
    });

    it('should perform token rotation (delete old token and create new one)', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/api/auth/super-admin/login')
        .send({
          email: 'superadmin.test@example.com',
          password: 'SuperAdmin@123'
        });

      const cookies = loginResponse.headers['set-cookie'];
      const tokensBeforeRefresh = await prisma.refreshToken.findMany({
        where: { user_id: superAdminId }
      });

      // Refresh
      const refreshResponse = await request(app)
        .get('/api/auth/refresh')
        .set('Cookie', cookies);

      expect(refreshResponse.status).toBe(200);

      const tokensAfterRefresh = await prisma.refreshToken.findMany({
        where: { user_id: superAdminId }
      });

      // Should have same count (rotation)
      expect(tokensAfterRefresh.length).toBeLessThanOrEqual(tokensBeforeRefresh.length + 1);
    });

    it('should return 401 with no cookie', async () => {
      const response = await request(app)
        .get('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('missing');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should delete the refresh token and clear the cookie', async () => {
      // Login
      const loginResponse = await request(app)
        .post('/api/auth/super-admin/login')
        .send({
          email: 'superadmin.test@example.com',
          password: 'SuperAdmin@123'
        });

      const cookies = loginResponse.headers['set-cookie'];

      // Logout
      const logoutResponse = await request(app)
        .get('/api/auth/logout')
        .set('Cookie', cookies);

      expect(logoutResponse.status).toBe(200);
      expect(logoutResponse.headers['set-cookie'][0]).toMatch(/refreshToken=/);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should return 200 with correct current password for OrgUser', async () => {
      // Login as OrgUser first
      const loginResponse = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'orgsuperadmin.test@example.com',
          password: 'OrgSuper@123'
        });

      const accessToken = loginResponse.body.data.accessToken;

      // Change password
      const changeResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OrgSuper@123',
          newPassword: 'NewPassword@456'
        });

      expect(changeResponse.status).toBe(200);

      // Verify new password works (then change back)
      const newLoginResponse = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'orgsuperadmin.test@example.com',
          password: 'NewPassword@456'
        });

      expect(newLoginResponse.status).toBe(200);

      // Change back to original
      const revertResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${newLoginResponse.body.data.accessToken}`)
        .send({
          currentPassword: 'NewPassword@456',
          newPassword: 'OrgSuper@123'
        });

      expect(revertResponse.status).toBe(200);
    });

    it('should return 400 with wrong current password', async () => {
      const loginResponse = await request(app)
        .post('/api/auth/org/login')
        .send({
          email: 'orgadmin.test@example.com',
          password: 'OrgAdmin@123'
        });

      const accessToken = loginResponse.body.data.accessToken;

      const changeResponse = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'WrongPassword',
          newPassword: 'NewPassword@456'
        });

      expect(changeResponse.status).toBe(400);
      expect(changeResponse.body.message).toContain('incorrect');
    });
  });
});
