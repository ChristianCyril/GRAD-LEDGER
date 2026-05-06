import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { jest } from '@jest/globals';

// Mock FIRST, before any dynamic imports
jest.unstable_mockModule('../../service/emailService.js', () => ({
  sendAdminCreatedEmail: jest.fn().mockResolvedValue(undefined),
  sendOrgApprovedEmail: jest.fn().mockResolvedValue(undefined),
  sendOrgRejectedEmail: jest.fn().mockResolvedValue(undefined),
  sendOrgDisabledEmail: jest.fn().mockResolvedValue(undefined),
}));

// Dynamic imports AFTER the mock
const { default: request } = await import('supertest');
const { default: bcrypt } = await import('bcrypt');
const { getPrismaClient } = await import('../prisma.singleton.js');
const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: cookieParser } = await import('cookie-parser');
const { default: orgSuperAdminRoutes } = await import('../../routes/orgSuperAdminRoutes.js');
const { default: corsOption } = await import('../../config/corsOption.js');
const { signAccessToken } = await import('../../service/jwtServices.js');

const prisma = getPrismaClient();

const app = express();
app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());
app.use('/api/org-super-admin', orgSuperAdminRoutes);

describe('Admin Management Integration Tests', () => {
  let orgId;
  let orgSuperAdminId;
  let orgSuperAdminToken;
  let orgAdminId;
  let orgAdminToken;

  // Seed approved org and ORG_SUPER_ADMIN token in beforeAll
  beforeAll(async () => {
    const timestamp = Date.now();

    // Seed an approved organisation
    const org = await prisma.organisation.create({
      data: {
        name: 'Admin Management Test University',
        code: 'AMTU-' + timestamp,
        type: 'UNIVERSITY',
        country: 'Cameroon',
        city: 'Yaoundé',
        official_email: 'admin.management.test' + timestamp + '@example.com',
        phone: '+237600000001',
        address: 'Admin Management Test Address',
        status: 'APPROVED'
      }
    });
    orgId = org.id;

    // Seed an ORG_SUPER_ADMIN user
    const orgSuperAdmin = await prisma.orgUser.create({
      data: {
        org_id: orgId,
        role: 'ORG_SUPER_ADMIN',
        full_name: 'Super Admin Test User',
        job_title: 'Registrar',
        email: 'super.admin.test' + timestamp + '@example.com',
        phone: '+237600000002',
        password_hash: await bcrypt.hash('SuperAdmin@123', 10),
        status: 'ACTIVE'
      }
    });
    orgSuperAdminId = orgSuperAdmin.id;

    // Generate ORG_SUPER_ADMIN token
    const orgSuperAdminPayload = {
      userId: orgSuperAdmin.id,
      role: 'ORG_SUPER_ADMIN',
      email: orgSuperAdmin.email,
      orgId: orgId
    };
    orgSuperAdminToken = signAccessToken(orgSuperAdminPayload);

    // Seed an ORG_ADMIN user for authorization tests
    const orgAdmin = await prisma.orgUser.create({
      data: {
        org_id: orgId,
        role: 'ORG_ADMIN',
        full_name: 'Admin Test User',
        job_title: 'Deputy Registrar',
        email: 'admin.test' + timestamp + '@example.com',
        phone: '+237600000003',
        password_hash: await bcrypt.hash('Admin@123', 10),
        status: 'ACTIVE'
      }
    });
    orgAdminId = orgAdmin.id;

    // Generate ORG_ADMIN token
    const orgAdminPayload = {
      userId: orgAdmin.id,
      role: 'ORG_ADMIN',
      email: orgAdmin.email,
      orgId: orgId
    };
    orgAdminToken = signAccessToken(orgAdminPayload);
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.orgUser.deleteMany({
      where: { org_id: orgId }
    }).catch(() => {});

    await prisma.organisation.delete({
      where: { id: orgId }
    }).catch(() => {});
  });

  // ─── POST /api/org-super-admin (createAdmin) Tests ──────────────────────────

  describe('POST /api/org-super-admin', () => {

    it('should create OrgUser with role ORG_ADMIN and return 201', async () => {
      const response = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'New Admin User',
          job_title: 'Department Manager',
          email: 'new.admin' + Date.now() + '@example.com',
          phone: '+237600000010'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Admin account created successfully');
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBeDefined();
      expect(response.body.data.full_name).toBe('New Admin User');
      expect(response.body.data.role).toBe('ORG_ADMIN');
      expect(response.body.data.status).toBe('ACTIVE');

      // Verify the admin was created in database
      const createdAdmin = await prisma.orgUser.findUnique({
        where: { email: response.body.data.email }
      });
      expect(createdAdmin).toBeDefined();
      expect(createdAdmin.org_id).toBe(orgId);
      expect(createdAdmin.role).toBe('ORG_ADMIN');
      expect(createdAdmin.status).toBe('ACTIVE');
    });

    it('should return 409 with existing email', async () => {
      const timestamp = Date.now();
      const email = 'duplicate.admin' + timestamp + '@example.com';

      // First, create an admin
      await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Admin One',
          job_title: 'Manager',
          email: email,
          phone: '+237600000011'
        });

      // Try to create another admin with the same email
      const response = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Admin Two',
          job_title: 'Manager',
          email: email,
          phone: '+237600000012'
        });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('An account with this email already exists');
    });

    it('should return 403 when ORG_ADMIN token is used', async () => {
      const response = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgAdminToken}`)
        .send({
          full_name: 'New Admin User',
          job_title: 'Department Manager',
          email: 'new.admin2' + Date.now() + '@example.com',
          phone: '+237600000013'
        });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Forbidden: insufficient permissions');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .post('/api/org-super-admin')
        .send({
          full_name: 'New Admin User',
          job_title: 'Department Manager',
          email: 'new.admin3' + Date.now() + '@example.com',
          phone: '+237600000014'
        });

      expect(response.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'New Admin User',
          job_title: 'Department Manager'
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Missing required fields');
      expect(response.body.fields).toContain('email');
      expect(response.body.fields).toContain('phone');
    });
  });

  // ─── GET /api/org-super-admin (getAdmins) Tests ────────────────────────────

  describe('GET /api/org-super-admin', () => {

    it('should return only ORG_ADMIN users for the caller\'s org', async () => {
      const timestamp = Date.now();

      // Create a few admins first
      await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Admin A',
          job_title: 'Manager',
          email: 'admin.a' + timestamp + '@example.com',
          phone: '+237600000020'
        });

      await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Admin B',
          job_title: 'Manager',
          email: 'admin.b' + timestamp + '@example.com',
          phone: '+237600000021'
        });

      const response = await request(app)
        .get('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.total).toBeGreaterThanOrEqual(2);

      // Verify all returned admins have expected fields
      response.body.data.forEach(admin => {
        expect(admin.id).toBeDefined();
        expect(admin.full_name).toBeDefined();
        expect(admin.email).toBeDefined();
        expect(admin.status).toBeDefined();
      });

      // Verify we can find the two admins we just created
      const adminAExists = response.body.data.some(a => a.email === 'admin.a' + timestamp + '@example.com');
      const adminBExists = response.body.data.some(a => a.email === 'admin.b' + timestamp + '@example.com');
      expect(adminAExists).toBe(true);
      expect(adminBExists).toBe(true);
    });

    it('should filter admins by search term', async () => {
      const response = await request(app)
        .get('/api/org-super-admin?search=Admin%20A')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter admins by status', async () => {
      const response = await request(app)
        .get('/api/org-super-admin?status=ACTIVE')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // All results should have ACTIVE status
      response.body.data.forEach(admin => {
        expect(admin.status).toBe('ACTIVE');
      });
    });

    it('should return 400 for invalid status filter', async () => {
      const response = await request(app)
        .get('/api/org-super-admin?status=INVALID')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });

    it('should return 401 when no token is provided', async () => {
      const response = await request(app)
        .get('/api/org-super-admin');

      expect(response.status).toBe(401);
    });
  });

  // ─── PATCH /api/org-super-admin/:id/disable (disableAdmin) Tests ────────────

  describe('PATCH /api/org-super-admin/:id/disable', () => {

    it('should set status to DISABLED', async () => {
      // Create an admin
      const createResp = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Admin To Disable',
          job_title: 'Manager',
          email: 'disable.admin' + Date.now() + '@example.com',
          phone: '+237600000030'
        });

      const adminId = createResp.body.data.id;

      // Disable the admin
      const response = await request(app)
        .patch(`/api/org-super-admin/${adminId}/disable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin account disabled successfully');

      // Verify status was updated in DB
      const updatedAdmin = await prisma.orgUser.findUnique({
        where: { id: adminId }
      });
      expect(updatedAdmin.status).toBe('DISABLED');
    });

    it('should return 404 when admin is not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/org-super-admin/${fakeId}/disable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Admin not found');
    });

    it('should return 403 when trying to disable admin from different org', async () => {
      const timestamp = Date.now();

      // Create an admin in a different org
      const otherOrg = await prisma.organisation.create({
        data: {
          name: 'Other Test University',
          code: 'OTU-' + timestamp,
          type: 'UNIVERSITY',
          country: 'Cameroon',
          city: 'Douala',
          official_email: 'other.test' + timestamp + '@example.com',
          phone: '+237700000001',
          address: 'Other Test Address',
          status: 'APPROVED'
        }
      });

      const otherAdmin = await prisma.orgUser.create({
        data: {
          org_id: otherOrg.id,
          role: 'ORG_ADMIN',
          full_name: 'Other Admin',
          job_title: 'Manager',
          email: 'other.admin' + timestamp + '@example.com',
          phone: '+237700000002',
          password_hash: await bcrypt.hash('Password@123', 10),
          status: 'ACTIVE'
        }
      });

      const response = await request(app)
        .patch(`/api/org-super-admin/${otherAdmin.id}/disable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');

      // Cleanup
      await prisma.orgUser.delete({ where: { id: otherAdmin.id } }).catch(() => {});
      await prisma.organisation.delete({ where: { id: otherOrg.id } }).catch(() => {});
    });

    it('should return 400 when admin is already disabled', async () => {
      // Create and disable an admin
      const createResp = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Already Disabled Admin',
          job_title: 'Manager',
          email: 'already.disabled' + Date.now() + '@example.com',
          phone: '+237600000031'
        });

      const adminId = createResp.body.data.id;

      // Disable it once
      await request(app)
        .patch(`/api/org-super-admin/${adminId}/disable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      // Try to disable again
      const response = await request(app)
        .patch(`/api/org-super-admin/${adminId}/disable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Admin account is already disabled');
    });

    it('should return 401 when no token is provided', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/org-super-admin/${fakeId}/disable`);

      expect(response.status).toBe(401);
    });
  });

  // ─── PATCH /api/org-super-admin/:id/enable (enableAdmin) Tests ──────────────

  describe('PATCH /api/org-super-admin/:id/enable', () => {

    it('should set status to ACTIVE', async () => {
      // Create an admin
      const createResp = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Admin To Enable',
          job_title: 'Manager',
          email: 'enable.admin' + Date.now() + '@example.com',
          phone: '+237600000040'
        });

      const adminId = createResp.body.data.id;

      // Disable it first
      await request(app)
        .patch(`/api/org-super-admin/${adminId}/disable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      // Enable it
      const response = await request(app)
        .patch(`/api/org-super-admin/${adminId}/enable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Admin account enabled successfully');

      // Verify status was updated in DB
      const updatedAdmin = await prisma.orgUser.findUnique({
        where: { id: adminId }
      });
      expect(updatedAdmin.status).toBe('ACTIVE');
    });

    it('should return 404 when admin is not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/org-super-admin/${fakeId}/enable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Admin not found');
    });

    it('should return 403 when trying to enable admin from different org', async () => {
      const timestamp = Date.now();

      // Create an admin in a different org
      const anotherOrg = await prisma.organisation.create({
        data: {
          name: 'Another Test University',
          code: 'ATU-' + timestamp,
          type: 'UNIVERSITY',
          country: 'Cameroon',
          city: 'Douala',
          official_email: 'another.test' + timestamp + '@example.com',
          phone: '+237700000010',
          address: 'Another Test Address',
          status: 'APPROVED'
        }
      });

      const anotherAdmin = await prisma.orgUser.create({
        data: {
          org_id: anotherOrg.id,
          role: 'ORG_ADMIN',
          full_name: 'Another Admin',
          job_title: 'Manager',
          email: 'another.admin' + timestamp + '@example.com',
          phone: '+237700000011',
          password_hash: await bcrypt.hash('Password@123', 10),
          status: 'DISABLED'
        }
      });

      const response = await request(app)
        .patch(`/api/org-super-admin/${anotherAdmin.id}/enable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Access denied');

      // Cleanup
      await prisma.orgUser.delete({ where: { id: anotherAdmin.id } }).catch(() => {});
      await prisma.organisation.delete({ where: { id: anotherOrg.id } }).catch(() => {});
    });

    it('should return 400 when admin is already enabled', async () => {
      // Create an admin (already active by default)
      const createResp = await request(app)
        .post('/api/org-super-admin')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({
          full_name: 'Already Enabled Admin',
          job_title: 'Manager',
          email: 'already.enabled' + Date.now() + '@example.com',
          phone: '+237600000041'
        });

      const adminId = createResp.body.data.id;

      // Try to enable when already enabled
      const response = await request(app)
        .patch(`/api/org-super-admin/${adminId}/enable`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Admin account is already active');
    });

    it('should return 401 when no token is provided', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/org-super-admin/${fakeId}/enable`);

      expect(response.status).toBe(401);
    });
  });
});
