import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { getPrismaClient } from '../prisma.singleton.js';

// Load environment variables for tests
dotenv.config({ path: '.env.test' });

const prisma = getPrismaClient();

// create a simple express app for testing
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import superAdminRoutes from '../../routes/superAdminRoutes.js';
import corsOption from '../../config/corsOption.js';
import { signAccessToken } from '../../service/jwtServices.js';

const app = express();
app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());
app.use('/api/super-admin', superAdminRoutes);

describe('Super Admin Integration Tests', () => {
  let superAdminId;
  let superAdminToken;
  let orgAdminId;
  let orgAdminToken;
  let pendingOrgId;
  let pendingOrgSuperAdminId;
  let approvedOrgId;
  let approvedOrgSuperAdminId;
  let approvedOrgAdminId;

  beforeAll(async () => {
    // Seed a super admin
    const superAdmin = await prisma.superAdmin.create({
      data: {
        email: 'superadmin.superadmintest@example.com',
        password_hash: await bcrypt.hash('SuperAdmin@123', 10)
      }
    });
    superAdminId = superAdmin.id;

    // Generate super admin token
    const superAdminPayload = {
      userId: superAdmin.id,
      role: 'SUPER_ADMIN',
      email: superAdmin.email
    };
    superAdminToken = signAccessToken(superAdminPayload);

    // Seed an approved organisation with users
    const approvedOrg = await prisma.organisation.create({
      data: {
        name: 'Approved University',
        code: 'APPROVED-UNI-' + Date.now(),
        type: 'UNIVERSITY',
        country: 'Cameroon',
        city: 'Yaoundé',
        official_email: 'approved.org.superadmintest@example.com',
        phone: '+237111111111',
        address: 'Approved Address',
        status: 'APPROVED'
      }
    });
    approvedOrgId = approvedOrg.id;

    // Seed ORG_SUPER_ADMIN for approved org
    const approvedOrgSuperAdmin = await prisma.orgUser.create({
      data: {
        org_id: approvedOrg.id,
        role: 'ORG_SUPER_ADMIN',
        full_name: 'Approved Org Super Admin',
        job_title: 'Registrar',
        email: 'approved.superadmin.superadmintest@example.com',
        phone: '+237222222222',
        password_hash: await bcrypt.hash('ApprovedSuper@123', 10),
        status: 'ACTIVE'
      }
    });
    approvedOrgSuperAdminId = approvedOrgSuperAdmin.id;

    // Seed ORG_ADMIN for approved org
    const approvedOrgAdmin = await prisma.orgUser.create({
      data: {
        org_id: approvedOrg.id,
        role: 'ORG_ADMIN',
        full_name: 'Approved Org Admin',
        job_title: 'Deputy Registrar',
        email: 'approved.admin.superadmintest@example.com',
        phone: '+237333333333',
        password_hash: await bcrypt.hash('ApprovedAdmin@123', 10),
        status: 'ACTIVE'
      }
    });
    approvedOrgAdminId = approvedOrgAdmin.id;

    // Generate org admin token
    const orgAdminPayload = {
      userId: approvedOrgAdmin.id,
      role: 'ORG_ADMIN',
      email: approvedOrgAdmin.email,
      orgId: approvedOrg.id
    };
    orgAdminToken = signAccessToken(orgAdminPayload);
  });

  beforeEach(async () => {
    // Seed a pending organisation in beforeEach
    const pendingOrg = await prisma.organisation.create({
      data: {
        name: 'Pending University',
        code: 'PENDING-UNI-' + Date.now(),
        type: 'UNIVERSITY',
        country: 'Cameroon',
        city: 'Douala',
        official_email: 'pending.org.superadmintest' + Date.now() + '@example.com',
        phone: '+237444444444',
        address: 'Pending Address',
        status: 'PENDING'
      }
    });
    pendingOrgId = pendingOrg.id;

    // Seed ORG_SUPER_ADMIN for pending org
    const pendingOrgSuperAdmin = await prisma.orgUser.create({
      data: {
        org_id: pendingOrg.id,
        role: 'ORG_SUPER_ADMIN',
        full_name: 'Pending Org Super Admin',
        job_title: 'Manager',
        email: 'pending.superadmin.superadmintest' + Date.now() + '@example.com',
        phone: '+237555555555',
        password_hash: await bcrypt.hash('PendingSuper@123', 10),
        status: 'ACTIVE'
      }
    });
    pendingOrgSuperAdminId = pendingOrgSuperAdmin.id;
  });

  afterEach(async () => {
    // Clean up pending org and its users
    if (pendingOrgSuperAdminId) {
      await prisma.orgUser.delete({
        where: { id: pendingOrgSuperAdminId }
      }).catch(() => {});
      pendingOrgSuperAdminId = null;
    }

    if (pendingOrgId) {
      await prisma.organisation.delete({
        where: { id: pendingOrgId }
      }).catch(() => {});
      pendingOrgId = null;
    }
  });

  afterAll(async () => {
    // Clean up all test data
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { user_id: superAdminId },
          { user_id: approvedOrgSuperAdminId },
          { user_id: approvedOrgAdminId }
        ]
      }
    });

    if (approvedOrgAdminId) {
      await prisma.orgUser.delete({
        where: { id: approvedOrgAdminId }
      }).catch(() => {});
    }

    if (approvedOrgSuperAdminId) {
      await prisma.orgUser.delete({
        where: { id: approvedOrgSuperAdminId }
      }).catch(() => {});
    }

    if (approvedOrgId) {
      await prisma.organisation.delete({
        where: { id: approvedOrgId }
      }).catch(() => {});
    }

    if (superAdminId) {
      await prisma.superAdmin.delete({
        where: { id: superAdminId }
      }).catch(() => {});
    }
  });

  describe('GET /api/super-admin/organisations/pending', () => {
    it('should return only pending organisations', async () => {
      const response = await request(app)
        .get('/api/super-admin/organisations/pending')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include the pending org created in beforeEach
      const pendingOrgs = response.body.data.filter(org => org.status === 'PENDING');
      expect(pendingOrgs.length).toBeGreaterThan(0);

      // Check that each pending org has the expected structure
      const pendingOrg = response.body.data.find(org => org.id === pendingOrgId);
      expect(pendingOrg).toBeDefined();
      expect(pendingOrg.name).toBe('Pending University');
      expect(pendingOrg.status).toBe('PENDING');
      expect(pendingOrg.users).toBeDefined();
      expect(Array.isArray(pendingOrg.users)).toBe(true);
      expect(pendingOrg.users.length).toBeGreaterThan(0);
      expect(pendingOrg.users[0]).toHaveProperty('full_name');
      expect(pendingOrg.users[0]).toHaveProperty('email');
    });
  });

  describe('PATCH /api/super-admin/organisations/:id/approve', () => {
    it('should set status to APPROVED', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${pendingOrgId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Organisation approved successfully');

      // Verify status was updated in DB
      const updatedOrg = await prisma.organisation.findUnique({
        where: { id: pendingOrgId }
      });
      expect(updatedOrg.status).toBe('APPROVED');
    });

    it('should return 404 for non-existent organisation', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${fakeId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('Organisation not found');
    });

    it('should return 400 for already approved organisation', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${approvedOrgId}/approve`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only pending organisations can be approved');
    });
  });

  describe('PATCH /api/super-admin/organisations/:id/reject', () => {
    it('should set status to REJECTED and save reason', async () => {
      const rejectionReason = 'Invalid documentation';
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${pendingOrgId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: rejectionReason });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Organisation rejected successfully');

      // Verify status and reason were updated in DB
      const updatedOrg = await prisma.organisation.findUnique({
        where: { id: pendingOrgId }
      });
      expect(updatedOrg.status).toBe('REJECTED');
      expect(updatedOrg.rejection_reason).toBe(rejectionReason);
    });

    it('should return 400 without reason', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${pendingOrgId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('A rejection reason is required');
    });

    it('should return 400 for already rejected organisation', async () => {
      // First reject the org
      await request(app)
        .patch(`/api/super-admin/organisations/${pendingOrgId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Test rejection' });

      // Try to reject again
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${pendingOrgId}/reject`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({ reason: 'Another reason' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Only pending organisations can be rejected');
    });
  });

  describe('PATCH /api/super-admin/organisations/:id/disable', () => {
    it('should set status to DISABLED and disable all OrgUsers', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${approvedOrgId}/disable`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Organisation disabled successfully');

      // Verify org status was updated
      const updatedOrg = await prisma.organisation.findUnique({
        where: { id: approvedOrgId }
      });
      expect(updatedOrg.status).toBe('DISABLED');
      expect(updatedOrg.disabled_at).toBeDefined();

      // Verify all users were disabled
      const orgUsers = await prisma.orgUser.findMany({
        where: { org_id: approvedOrgId }
      });
      expect(orgUsers.length).toBeGreaterThan(0);
      orgUsers.forEach(user => {
        expect(user.status).toBe('DISABLED');
      });
    });

    it('should return 400 for pending organisation', async () => {
      const response = await request(app)
        .patch(`/api/super-admin/organisations/${pendingOrgId}/disable`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Only approved organisations can be disabled');
    });
  });

  describe('GET /api/super-admin/organisations', () => {
    it('should filter correctly with ?search=', async () => {
      const response = await request(app)
        .get('/api/super-admin/organisations?search=Approved')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include the approved org
      const foundOrg = response.body.data.find(org => org.id === approvedOrgId);
      expect(foundOrg).toBeDefined();
      expect(foundOrg.name).toBe('Approved University');

      // Should not include the pending org
      const pendingOrg = response.body.data.find(org => org.id === pendingOrgId);
      expect(pendingOrg).toBeUndefined();
    });

    it('should filter correctly with ?status=', async () => {
      const response = await request(app)
        .get('/api/super-admin/organisations?status=PENDING')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Should include the pending org
      const foundOrg = response.body.data.find(org => org.id === pendingOrgId);
      expect(foundOrg).toBeDefined();
      expect(foundOrg.status).toBe('PENDING');

      // Should not include the approved org
      const approvedOrg = response.body.data.find(org => org.id === approvedOrgId);
      expect(approvedOrg).toBeUndefined();
    });

    it('should return 400 for invalid status', async () => {
      const response = await request(app)
        .get('/api/super-admin/organisations?status=INVALID')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid status');
    });
  });

  describe('Authorization Tests', () => {
    const testRoutes = [
      { method: 'GET', path: '/api/super-admin/organisations/pending' },
      { method: 'GET', path: '/api/super-admin/organisations' },
      { method: 'PATCH', path: `/api/super-admin/organisations/${pendingOrgId}/approve` },
      { method: 'PATCH', path: `/api/super-admin/organisations/${pendingOrgId}/reject`, body: { reason: 'Test' } },
      { method: 'PATCH', path: `/api/super-admin/organisations/${approvedOrgId}/disable` }
    ];

    testRoutes.forEach(({ method, path, body }) => {
      it(`should return 401 without token for ${method} ${path}`, async () => {
        const req = request(app)[method.toLowerCase()](path);
        if (body) req.send(body);

        const response = await req;
        expect(response.status).toBe(401);
      });

      it(`should return 403 with ORG_ADMIN token for ${method} ${path}`, async () => {
        const req = request(app)[method.toLowerCase()](path)
          .set('Authorization', `Bearer ${orgAdminToken}`);
        if (body) req.send(body);

        const response = await req;
        expect(response.status).toBe(403);
        expect(response.body.message).toBe('Forbidden: insufficient permissions');
      });
    });
  });
});
