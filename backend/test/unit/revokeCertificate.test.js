import { jest } from '@jest/globals';

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockFindUnique = jest.fn();
const mockUpdate     = jest.fn();
const mockTransaction = jest.fn();
const mockRevokeOnChain = jest.fn();
const mockSendRevocationEmail = jest.fn();

jest.unstable_mockModule('../../config/prisma.js', () => ({
  default: {
    certificate: {
      findUnique: mockFindUnique,
      update:     mockUpdate
    },
    $transaction: mockTransaction
  }
}));

jest.unstable_mockModule('../../service/blockchainService.js', () => ({
  revokeOnChain:  mockRevokeOnChain,
  issueOnChain:   jest.fn(),
  verifyOnChain:  jest.fn()
}));

jest.unstable_mockModule('../../service/emailService.js', () => ({
  sendRevocationEmail:      mockSendRevocationEmail,
  sendCertificateIssuedEmail: jest.fn()
}));

// ─────────────────────────────────────────────────────────────────────────────
// IMPORT AFTER MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const { revokeCertificate } = await import('../../controller/certificateController.js');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const makeReq = (overrides = {}) => ({
  params: { id: 'cert-123' },
  body:   { reason: 'Fraudulent document' },
  user:   { id: 'user-1', orgId: 'org-1' },
  ...overrides
});

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const makeCertificate = (overrides = {}) => ({
  id:     'cert-123',
  org_id: 'org-1',
  status: 'CONFIRMED',
  student: {
    full_name: 'John Doe',
    email:     'john@example.com'
  },
  organisation: {
    name: 'Test University'
  },
  ...overrides
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('revokeCertificate', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ───────────────────────────────────────────────────────────────────────────

  it('should return 400 when reason is missing', async () => {
    const req = makeReq({ body: { reason: '' } });
    const res = makeRes();

    await revokeCertificate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'A revocation reason is required'
    });

    // Should not touch the database at all
    expect(mockFindUnique).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────

  it('should return 400 when certificate status is already REVOKED', async () => {
    const req = makeReq();
    const res = makeRes();

    mockFindUnique.mockResolvedValue(makeCertificate({ status: 'REVOKED' }));

    await revokeCertificate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'This certificate has already been revoked'
    });

    // Should not attempt blockchain call
    expect(mockRevokeOnChain).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────

  it('should return 400 when certificate status is PENDING', async () => {
    const req = makeReq();
    const res = makeRes();

    mockFindUnique.mockResolvedValue(makeCertificate({ status: 'PENDING' }));

    await revokeCertificate(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Cannot revoke a certificate that is still pending blockchain confirmation'
    });

    expect(mockRevokeOnChain).not.toHaveBeenCalled();
  });

  // ───────────────────────────────────────────────────────────────────────────

  it('should return 403 when certificate belongs to a different org', async () => {
    const req = makeReq({
      user: { id: 'user-1', orgId: 'org-DIFFERENT' }
    });
    const res = makeRes();

    // Certificate belongs to org-1, but caller is from org-DIFFERENT
    mockFindUnique.mockResolvedValue(makeCertificate({ org_id: 'org-1' }));

    await revokeCertificate(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Access denied'
    });

    expect(mockRevokeOnChain).not.toHaveBeenCalled();
  });

});