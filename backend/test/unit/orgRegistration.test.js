import { jest } from '@jest/globals';

// ─── Mock all external dependencies ──────────────────────────────────────────
// Rules:
//  1. jest.unstable_mockModule paths must NOT have .js extensions —
//     moduleNameMapper strips them before Jest resolves modules, so the
//     literal string passed to unstable_mockModule must already be extension-free
//  2. This file lives at backend/test/unit/ so every backend module is ../../
//  3. All mocks must be declared before any dynamic import() of the controllers

const mockFindUnique  = jest.fn();
const mockCreate      = jest.fn();
const mockUpdate      = jest.fn();
const mockUpdateMany  = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../../config/prisma', () => ({
  default: {
    organisation: {
      findUnique: mockFindUnique,
      create:     mockCreate,
      update:     mockUpdate
    },
    orgUser: {
      findUnique: mockFindUnique,
      updateMany: mockUpdateMany
    },
    $transaction: mockTransaction
  }
}));

const mockCloudinaryUpload = jest.fn();
jest.unstable_mockModule('../../config/cloudinary', () => ({
  default: {
    uploader: { upload: mockCloudinaryUpload }
  }
}));

jest.unstable_mockModule('../../service/emailService', () => ({
  sendRegistrationReceivedEmail:        jest.fn().mockResolvedValue(undefined),
  sendNewRegistrationNotificationEmail: jest.fn().mockResolvedValue(undefined),
  sendOrgApprovedEmail:                 jest.fn().mockResolvedValue(undefined),
  sendOrgRejectedEmail:                 jest.fn().mockResolvedValue(undefined),
  sendOrgDisabledEmail:                 jest.fn().mockResolvedValue(undefined)
}));

jest.unstable_mockModule('fs', () => ({
  default: {
    unlinkSync:   jest.fn(),
    existsSync:   jest.fn().mockReturnValue(false),
    readFileSync: jest.fn().mockReturnValue(Buffer.from('pdf content'))
  }
}));

// ─── Import controllers AFTER mocks are registered ───────────────────────────
// Dynamic import() is required for ESM mocking to work correctly

const { registerOrganisation } = await import('../../controller/orgController');
const { approveOrganisation, disableOrganisation } =
  await import('../../controller/superAdminController');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Builds a minimal mock request for registerOrganisation.
 * Pass { body: {...}, files: {...} } to override only what you need per test.
 * Spread is shallow — overrides.body replaces individual keys, not the whole body.
 */
const buildRegisterReq = (overrides = {}) => ({
  body: {
    name:              'Test University',
    code:              'TU1',
    type:              'UNIVERSITY',
    country:           'Cameroon',
    city:              'Yaoundé',
    website:           'https://tu.cm',
    official_email:    'info@tu.cm',
    phone:             '+237600000001',
    address:           '123 Test Street',
    super_admin_name:  'Dr. Test Admin',
    super_admin_title: 'Registrar',
    super_admin_email: 'admin@tu.cm',
    super_admin_phone: '+237600000002',
    password:          'Password@123',
    confirm_password:  'Password@123',
    ...(overrides.body ?? {})
  },
  files: {
    doc_incorporation:    [{ path: '/tmp/inc.pdf'    }],
    doc_letter_of_intent: [{ path: '/tmp/letter.pdf' }],
    doc_accreditation:    [{ path: '/tmp/accred.pdf' }],
    ...(overrides.files ?? {})
  }
});

/** Builds a minimal Express-style res mock. */
const buildRes = () => {
  const res  = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

// ─── registerOrganisation ─────────────────────────────────────────────────────

describe('registerOrganisation — unit tests', () => {

  beforeEach(() => jest.clearAllMocks());

  // ── Password validation ────────────────────────────────────────────────────

  describe('password validation', () => {

    it('returns 400 when password and confirm_password do not match', async () => {
      const req = buildRegisterReq({
        body: { password: 'Password@123', confirm_password: 'Different@456' }
      });
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Passwords do not match' })
      );
      // Cloudinary must never be called on an early-exit validation failure
      expect(mockCloudinaryUpload).not.toHaveBeenCalled();
    });

    it('returns 400 when password is shorter than 8 characters', async () => {
      const req = buildRegisterReq({
        body: { password: 'Ab1!', confirm_password: 'Ab1!' }
      });
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Password must be at least 8 characters' })
      );
    });
  });

  // ── official_email uniqueness ──────────────────────────────────────────────

  describe('official_email uniqueness', () => {

    it('returns 409 with field: official_email when that email is already registered', async () => {
      // Your controller runs Promise.all([official_email, code, super_admin_email])
      // so mockResolvedValueOnce order must match that exact order
      mockFindUnique
        .mockResolvedValueOnce({ id: 'existing-org' })  // official_email → hit
        .mockResolvedValueOnce(null)                     // code           → miss
        .mockResolvedValueOnce(null);                    // super_admin_email → miss

      const req = buildRegisterReq();
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'official_email' })
      );
      expect(mockCloudinaryUpload).not.toHaveBeenCalled();
    });
  });

  // ── code uniqueness ────────────────────────────────────────────────────────

  describe('code uniqueness', () => {

    it('returns 409 with field: code when the organisation code is already taken', async () => {
      mockFindUnique
        .mockResolvedValueOnce(null)                    // official_email → miss
        .mockResolvedValueOnce({ id: 'other-org' })     // code           → hit
        .mockResolvedValueOnce(null);                   // super_admin_email → miss

      const req = buildRegisterReq();
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'code' })
      );
      expect(mockCloudinaryUpload).not.toHaveBeenCalled();
    });

    it('returns 409 with field: super_admin_email when that email belongs to an existing OrgUser', async () => {
      mockFindUnique
        .mockResolvedValueOnce(null)                         // official_email → miss
        .mockResolvedValueOnce(null)                         // code           → miss
        .mockResolvedValueOnce({ id: 'existing-user' });     // super_admin_email → hit

      const req = buildRegisterReq();
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ field: 'super_admin_email' })
      );
      expect(mockCloudinaryUpload).not.toHaveBeenCalled();
    });
  });

  // ── Missing required fields ────────────────────────────────────────────────

  describe('required field validation', () => {

    it('returns 400 when a required text field is blank', async () => {
      const req = buildRegisterReq({ body: { name: '' } });
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Missing required fields' })
      );
    });

    it('returns 400 when doc_incorporation file is missing', async () => {
      const req = buildRegisterReq({
        files: { doc_incorporation: undefined }
      });
      const res = buildRes();

      await registerOrganisation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Incorporation')
        })
      );
    });
  });
});

// ─── approveOrganisation ──────────────────────────────────────────────────────

describe('approveOrganisation — unit tests', () => {

  beforeEach(() => jest.clearAllMocks());

  it('returns 400 when the organisation is already APPROVED', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'org-id', name: 'Test Uni', status: 'APPROVED', users: []
    });

    const req = { params: { id: 'org-id' } };
    const res = buildRes();

    await approveOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('APPROVED') })
    );
    // update must NOT fire — no DB state change on a 400
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 400 when the organisation is REJECTED (only PENDING can be approved)', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'org-id', name: 'Test Uni', status: 'REJECTED', users: []
    });

    const req = { params: { id: 'org-id' } };
    const res = buildRes();

    await approveOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('returns 404 when organisation does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const req = { params: { id: 'non-existent' } };
    const res = buildRes();

    await approveOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns 200 and calls prisma.update with APPROVED for a PENDING organisation', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'org-id', name: 'Test Uni', status: 'PENDING',
      users: [{ email: 'admin@tu.cm', full_name: 'Dr. Admin' }]
    });
    mockUpdate.mockResolvedValueOnce({ id: 'org-id', status: 'APPROVED' });

    const req = { params: { id: 'org-id' } };
    const res = buildRes();

    await approveOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'org-id' },
        data:  { status: 'APPROVED' }
      })
    );
  });
});

// ─── disableOrganisation ──────────────────────────────────────────────────────

describe('disableOrganisation — unit tests', () => {

  beforeEach(() => jest.clearAllMocks());

  it('sets all OrgUsers to DISABLED when an APPROVED org is disabled', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'org-id', name: 'Test Uni', status: 'APPROVED',
      users: [{ email: 'admin@tu.cm' }]
    });

    // Your controller calls prisma.$transaction([updateOrg, updateManyUsers])
    // The array items are already-created promises, so we resolve them all
    mockTransaction.mockImplementation((ops) => Promise.all(ops));
    mockUpdate.mockResolvedValueOnce({ id: 'org-id', status: 'DISABLED' });
    mockUpdateMany.mockResolvedValueOnce({ count: 2 });

    const req = { params: { id: 'org-id' } };
    const res = buildRes();

    await disableOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    // The key assertion: all users for this org must be disabled
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { org_id: 'org-id' },
        data:  { status: 'DISABLED' }
      })
    );
  });

  it('returns 400 when the organisation is already DISABLED', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'org-id', name: 'Test Uni', status: 'DISABLED', users: []
    });

    const req = { params: { id: 'org-id' } };
    const res = buildRes();

    await disableOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Organisation is already disabled' })
    );
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns 400 when trying to disable a PENDING organisation', async () => {
    mockFindUnique.mockResolvedValueOnce({
      id: 'org-id', status: 'PENDING', users: []
    });

    const req = { params: { id: 'org-id' } };
    const res = buildRes();

    await disableOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockTransaction).not.toHaveBeenCalled();
  });

  it('returns 404 when organisation does not exist', async () => {
    mockFindUnique.mockResolvedValueOnce(null);

    const req = { params: { id: 'ghost-id' } };
    const res = buildRes();

    await disableOrganisation(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});