import { jest } from '@jest/globals';

// ─── Mock all external dependencies ──────────────────────────────────────────
// Rules:
//  1. jest.unstable_mockModule paths must NOT have .js extensions
//  2. This file lives at backend/test/unit/ so every backend module is ../../
//  3. All mocks must be declared before any dynamic import() of the controllers

const mockFindUnique = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockTransaction = jest.fn();
const mockCount = jest.fn();
const mockFindMany = jest.fn();

jest.unstable_mockModule('../../config/prisma', () => ({
  default: {
    organisation: {
      findUnique: mockFindUnique
    },
    orgUser: {
      findUnique: mockFindUnique,
      create: mockCreate,
      update: mockUpdate,
      findMany: mockFindMany,
      count: mockCount
    },
    auditLog: {
      create: mockCreate
    },
    $transaction: mockTransaction
  }
}));

const mockSendAdminCreatedEmail = jest.fn().mockResolvedValue(undefined);
jest.unstable_mockModule('../../service/emailService', () => ({
  sendAdminCreatedEmail: mockSendAdminCreatedEmail
}));

// Mock bcrypt
const mockBcryptHash = jest.fn();
jest.unstable_mockModule('bcrypt', () => ({
  default: {
    hash: mockBcryptHash
  }
}));

// ─── Import controllers AFTER mocks are registered ───────────────────────────
const { createAdmin, enableAdmin, disableAdmin, getAdmins } =
  await import('../../controller/orgSuperAdminController');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal mock request for admin management endpoints.
 */
const buildReq = (overrides = {}) => ({
  body: {
    full_name: 'John Doe',
    job_title: 'Department Manager',
    email: 'john.doe@example.com',
    phone: '+237600000001',
    ...(overrides.body ?? {})
  },
  params: {
    id: 'admin-id-123',
    ...(overrides.params ?? {})
  },
  query: {
    ...(overrides.query ?? {})
  },
  user: {
    id: 'user-id-123',
    orgId: 'org-id-123',
    role: 'ORG_SUPER_ADMIN',
    ...(overrides.user ?? {})
  }
});

/**
 * Builds a minimal Express-style response mock.
 */
const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

/**
 * Helper to create a mock transaction function.
 */
const createMockTransaction = (operations = {}) => {
  return jest.fn(async (callback) => {
    const tx = {
      orgUser: {
        create: operations.orgUserCreate || mockCreate,
        update: operations.orgUserUpdate || mockUpdate
      },
      auditLog: {
        create: operations.auditLogCreate || mockCreate
      }
    };
    return callback(tx);
  });
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Admin Management - Unit Tests', () => {

  // ─── BEFORE/AFTER HOOKS ──────────────────────────────────────────────────────

  beforeEach(() => {
    jest.clearAllMocks();
    mockBcryptHash.mockResolvedValue('hashed_password');
  });

  // ─── CREATE ADMIN TESTS ──────────────────────────────────────────────────────

  describe('createAdmin', () => {

    it('should create admin successfully with valid data', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock database operations
      mockFindUnique.mockResolvedValueOnce(null); // email does not exist
      mockFindUnique.mockResolvedValueOnce({
        id: 'org-id-123',
        name: 'Test University'
      }); // organisation found

      // Mock transaction
      const mockTx = {
        orgUser: {
          create: jest.fn().mockResolvedValue({
            id: 'new-admin-id',
            org_id: 'org-id-123',
            full_name: 'John Doe',
            job_title: 'Department Manager',
            email: 'john.doe@example.com',
            phone: '+237600000001',
            status: 'ACTIVE',
            role: 'ORG_ADMIN'
          })
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({
            id: 'audit-log-id',
            action: 'ADMIN_CREATED'
          })
        }
      };
      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await createAdmin(req, res);

      // Verify email was checked for uniqueness
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' }
      });

      // Verify password was hashed
      expect(mockBcryptHash).toHaveBeenCalled();

      // Verify transaction was used
      expect(mockTransaction).toHaveBeenCalled();

      // Verify audit log was created
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADMIN_CREATED',
            org_id: 'org-id-123',
            actor_id: 'user-id-123'
          })
        })
      );

      // Verify email was sent
      expect(mockSendAdminCreatedEmail).toHaveBeenCalled();

      // Verify response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin account created successfully',
          data: expect.objectContaining({
            id: 'new-admin-id',
            full_name: 'John Doe'
          })
        })
      );
    });

    it('should return 409 when email already exists in OrgUser', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: email already exists
      mockFindUnique.mockResolvedValueOnce({
        id: 'existing-admin-id',
        email: 'john.doe@example.com',
        org_id: 'another-org-id'
      });

      await createAdmin(req, res);

      // Verify 409 status code
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        message: 'An account with this email already exists'
      });

      // Verify that no further database operations occurred
      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockSendAdminCreatedEmail).not.toHaveBeenCalled();
    });

    it('should return 400 when required fields are missing', async () => {
      const req = buildReq({
        body: {
          full_name: '',
          job_title: 'Department Manager',
          email: 'john.doe@example.com',
          phone: '+237600000001'
        }
      });
      const res = buildRes();

      await createAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Missing required fields',
          fields: expect.arrayContaining(['full_name'])
        })
      );
    });

    it('should return 404 when organisation is not found', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: email does not exist
      mockFindUnique.mockResolvedValueOnce(null);
      // Mock: organisation not found
      mockFindUnique.mockResolvedValueOnce(null);

      await createAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Organisation not found'
      });
    });

    it('should normalize email to lowercase and trim whitespace', async () => {
      const req = buildReq({
        body: {
          full_name: 'John Doe',
          job_title: 'Department Manager',
          email: '  JOHN.DOE@EXAMPLE.COM  ',
          phone: '+237600000001'
        }
      });
      const res = buildRes();

      mockFindUnique.mockResolvedValueOnce(null); // email does not exist
      mockFindUnique.mockResolvedValueOnce({
        id: 'org-id-123',
        name: 'Test University'
      });

      const mockTx = {
        orgUser: {
          create: jest.fn().mockResolvedValue({
            id: 'new-admin-id',
            email: 'john.doe@example.com'
          })
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({})
        }
      };
      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await createAdmin(req, res);

      // Verify that email was normalized
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: 'john.doe@example.com' }
      });

      expect(mockTx.orgUser.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'john.doe@example.com'
          })
        })
      );
    });
  });

  // ─── ENABLE ADMIN TESTS ──────────────────────────────────────────────────────

  describe('enableAdmin', () => {

    it('should enable admin successfully', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin found
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-123',
        org_id: 'org-id-123',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ORG_ADMIN',
        status: 'DISABLED'
      });

      // Mock transaction
      const mockTx = {
        orgUser: {
          update: jest.fn().mockResolvedValue({
            id: 'admin-id-123',
            status: 'ACTIVE'
          })
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({})
        }
      };
      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await enableAdmin(req, res);

      // Verify transaction was called
      expect(mockTransaction).toHaveBeenCalled();

      // Verify admin was updated to ACTIVE
      expect(mockTx.orgUser.update).toHaveBeenCalledWith({
        where: { id: 'admin-id-123' },
        data: { status: 'ACTIVE' }
      });

      // Verify audit log was created
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADMIN_ENABLED',
            org_id: 'org-id-123',
            actor_id: 'user-id-123'
          })
        })
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Admin account enabled successfully'
      });
    });

    it('should return 403 when admin belongs to a different org', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin found but belongs to different org
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-123',
        org_id: 'different-org-id',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ORG_ADMIN',
        status: 'DISABLED'
      });

      await enableAdmin(req, res);

      // Verify 403 status code
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied'
      });

      // Verify that no database modifications occurred
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should return 404 when admin is not found', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin not found
      mockFindUnique.mockResolvedValueOnce(null);

      await enableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Admin not found'
      });
    });

    it('should return 400 when admin is not an ORG_ADMIN', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: user found but not an ORG_ADMIN
      mockFindUnique.mockResolvedValueOnce({
        id: 'user-id-456',
        org_id: 'org-id-123',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'ORG_USER', // Not ORG_ADMIN
        status: 'DISABLED'
      });

      await enableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'This action can only be performed on admin accounts'
      });
    });

    it('should return 400 when admin is already active', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin already active
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-123',
        org_id: 'org-id-123',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ORG_ADMIN',
        status: 'ACTIVE'
      });

      await enableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Admin account is already active'
      });
    });
  });

  // ─── DISABLE ADMIN TESTS ─────────────────────────────────────────────────────

  describe('disableAdmin', () => {

    it('should disable admin successfully and create audit log entry', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin found
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-123',
        org_id: 'org-id-123',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ORG_ADMIN',
        status: 'ACTIVE'
      });

      // Mock transaction
      const mockTx = {
        orgUser: {
          update: jest.fn().mockResolvedValue({
            id: 'admin-id-123',
            status: 'DISABLED'
          })
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({
            id: 'audit-log-id',
            org_id: 'org-id-123',
            actor_id: 'user-id-123',
            action: 'ADMIN_DISABLED',
            description: 'Admin account disabled for John Doe (john.doe@example.com)'
          })
        }
      };
      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await disableAdmin(req, res);

      // Verify transaction was called
      expect(mockTransaction).toHaveBeenCalled();

      // Verify admin was updated to DISABLED
      expect(mockTx.orgUser.update).toHaveBeenCalledWith({
        where: { id: 'admin-id-123' },
        data: { status: 'DISABLED' }
      });

      // ✓ Test that disableAdmin creates an audit log entry
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADMIN_DISABLED',
            org_id: 'org-id-123',
            actor_id: 'user-id-123',
            description: expect.stringContaining('John Doe')
          })
        })
      );

      // Verify response
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Admin account disabled successfully'
      });
    });

    it('should include admin name and email in audit log description', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin found
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-999',
        org_id: 'org-id-123',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'ORG_ADMIN',
        status: 'ACTIVE'
      });

      // Mock transaction
      const mockTx = {
        orgUser: {
          update: jest.fn().mockResolvedValue({})
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({})
        }
      };
      mockTransaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await disableAdmin(req, res);

      // Verify audit log contains full name and email
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'ADMIN_DISABLED',
            description: 'Admin account disabled for Jane Smith (jane.smith@example.com)'
          })
        })
      );
    });

    it('should return 403 when admin belongs to a different org', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin found but belongs to different org
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-123',
        org_id: 'different-org-id',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ORG_ADMIN',
        status: 'ACTIVE'
      });

      await disableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Access denied'
      });

      // Verify no transaction occurred
      expect(mockTransaction).not.toHaveBeenCalled();
    });

    it('should return 404 when admin is not found', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin not found
      mockFindUnique.mockResolvedValueOnce(null);

      await disableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Admin not found'
      });
    });

    it('should return 400 when admin is not an ORG_ADMIN', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: user found but not an ORG_ADMIN
      mockFindUnique.mockResolvedValueOnce({
        id: 'user-id-456',
        org_id: 'org-id-123',
        full_name: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: 'ORG_USER', // Not ORG_ADMIN
        status: 'ACTIVE'
      });

      await disableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'This action can only be performed on admin accounts'
      });
    });

    it('should return 400 when admin is already disabled', async () => {
      const req = buildReq();
      const res = buildRes();

      // Mock: admin already disabled
      mockFindUnique.mockResolvedValueOnce({
        id: 'admin-id-123',
        org_id: 'org-id-123',
        full_name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'ORG_ADMIN',
        status: 'DISABLED'
      });

      await disableAdmin(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Admin account is already disabled'
      });
    });
  });

  // ─── GET ADMINS TESTS ────────────────────────────────────────────────────────

  describe('getAdmins', () => {

    it('should return list of admins for the organization', async () => {
      const req = buildReq();
      const res = buildRes();

      const mockAdmins = [
        {
          id: 'admin-1',
          full_name: 'John Doe',
          job_title: 'Department Manager',
          email: 'john@example.com',
          phone: '+237600000001',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date()
        },
        {
          id: 'admin-2',
          full_name: 'Jane Smith',
          job_title: 'Deputy Manager',
          email: 'jane@example.com',
          phone: '+237600000002',
          status: 'ACTIVE',
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      mockFindMany.mockResolvedValueOnce(mockAdmins);
      mockCount.mockResolvedValueOnce(2);

      await getAdmins(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockAdmins,
        total: 2
      });
    });

    it('should filter admins by search term', async () => {
      const req = buildReq({
        query: { search: 'John' }
      });
      const res = buildRes();

      const mockAdmins = [
        {
          id: 'admin-1',
          full_name: 'John Doe',
          job_title: 'Department Manager',
          email: 'john@example.com',
          phone: '+237600000001',
          status: 'ACTIVE'
        }
      ];

      mockFindMany.mockResolvedValueOnce(mockAdmins);
      mockCount.mockResolvedValueOnce(1);

      await getAdmins(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        data: mockAdmins,
        total: 1
      });
    });

    it('should return 400 when status filter is invalid', async () => {
      const req = buildReq({
        query: { status: 'INVALID_STATUS' }
      });
      const res = buildRes();

      await getAdmins(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid status')
        })
      );
    });
  });
});
