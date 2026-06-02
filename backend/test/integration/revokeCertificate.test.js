import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });
import fs from 'fs';
import path from 'path';
import { jest } from '@jest/globals';

jest.setTimeout(15000);

// ─────────────────────────────────────────────────────────────────────────────
// MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const mockIssueOnChain = jest.fn();
const mockRevokeOnChain = jest.fn();
const mockVerifyOnChain = jest.fn();
const mockSendCertificateIssuedEmail = jest.fn();
const mockSendRevocationEmail = jest.fn();

jest.unstable_mockModule('../../service/blockchainService.js', () => ({
  issueOnChain: mockIssueOnChain,
  revokeOnChain: mockRevokeOnChain,
  verifyOnChain: mockVerifyOnChain,
  unrevokeOnChain: jest.fn()
}));

jest.unstable_mockModule('../../service/stampQRCodeOnPDF.js', () => ({
  stampQRCodeOnPDF: jest.fn()
}));

jest.unstable_mockModule('../../service/validatePDF.js', () => ({
  validatePDF: jest.fn().mockResolvedValue({
    valid: true
  })
}));


jest.unstable_mockModule('../../service/emailService.js', () => ({
  sendCertificateIssuedEmail: mockSendCertificateIssuedEmail,
  sendRevocationEmail: mockSendRevocationEmail,
  sendCertificateUnrevokedEmail: jest.fn()
}));

jest.unstable_mockModule('../../config/cloudinary.js', () => ({
  default: {
    uploader: {
      upload: jest.fn().mockResolvedValue({
        secure_url: 'https://cloudinary.com/fake-cert.pdf'
      })
    }
  }
}));

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTS AFTER MOCKS
// ─────────────────────────────────────────────────────────────────────────────

const { default: request } = await import('supertest');
const { default: bcrypt } = await import('bcrypt');
const { default: express } = await import('express');
const { default: cors } = await import('cors');
const { default: cookieParser } = await import('cookie-parser');

const { getPrismaClient } = await import('../prisma.singleton.js');
const { signAccessToken } = await import('../../service/jwtServices.js');
const { default: corsOption } = await import('../../config/corsOption.js');
const { default: certificateRoutes } = await import('../../routes/certificateRoutes.js');

const prisma = getPrismaClient();

// ─────────────────────────────────────────────────────────────────────────────
// APP SETUP
// ─────────────────────────────────────────────────────────────────────────────

const app = express();

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

app.use('/api/certificates', certificateRoutes);

// Catch multer errors
app.use((err, req, res, next) => {
  if (err.message === 'Only PDF, JPEG, and PNG files are allowed') {
    return res.status(400).json({ message: 'Uploaded file must be a PDF' });
  }
  next(err);
});

// ─────────────────────────────────────────────────────────────────────────────
// TEST DATA
// ─────────────────────────────────────────────────────────────────────────────

let org;
let superAdmin;
let orgSuperAdminToken;
let confirmedCertificateId;

const pdfPath = path.resolve('test', 'fixtures', 'sample.pdf');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const createUniquePdfPath = () => {
  const uniquePath = path.resolve(
    'test', 'fixtures', `revoke-${Date.now()}-${Math.random()}.pdf`
  );
  fs.writeFileSync(
    uniquePath,
    `%PDF-1.4 fake pdf content ${Date.now()} ${Math.random()}`
  );
  return uniquePath;
};

// ─────────────────────────────────────────────────────────────────────────────
// BEFORE ALL — seed org, admin, and issue a confirmed certificate
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {

  const fixtureDir = path.resolve('test', 'fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }

  if (!fs.existsSync(pdfPath)) {
    fs.writeFileSync(pdfPath, '%PDF-1.4 fake pdf content');
  }

  const hashedPassword = await bcrypt.hash('password123', 10);

  org = await prisma.organisation.create({
    data: {
      name: 'Revocation Test University',
      code: `RTU-${Date.now()}`,
      type: 'UNIVERSITY',
      country: 'Cameroon',
      city: 'Yaounde',
      official_email: `revoke-org${Date.now()}@gmail.com`,
      phone: '677000001',
      address: 'Test Address',
      status: 'APPROVED'
    }
  });

  superAdmin = await prisma.orgUser.create({
    data: {
      org_id: org.id,
      role: 'ORG_SUPER_ADMIN',
      full_name: 'Revoke Admin',
      job_title: 'Registrar',
      email: `revoke-admin${Date.now()}@gmail.com`,
      phone: '677111112',
      password_hash: hashedPassword,
      status: 'ACTIVE',
      reg_email_status: 'SENT'
    }
  });

  orgSuperAdminToken = signAccessToken({
    userId: superAdmin.id,
    orgId: org.id,
    role: superAdmin.role
  });

  // ── Issue a certificate that will be used across revocation tests ──────────
  mockIssueOnChain.mockResolvedValue('0xaabbccddeeff');
  mockSendCertificateIssuedEmail.mockResolvedValue(undefined);

  const uniquePdf = createUniquePdfPath();

  const response = await request(app)
    .post('/api/certificates')
    .set('Authorization', `Bearer ${orgSuperAdminToken}`)
    .field('full_name', 'Jane Smith')
    .field('matricule', `MAT-REV-${Date.now()}`)
    .field('email', `jane${Date.now()}@gmail.com`)
    .field('department', 'Law')
    .field('program', 'International Law')
    .field('year_of_entry', '2019')
    .field('year_of_graduation', '2023')
    .field('gpa', '3.9')
    .attach('certificate_pdf', uniquePdf);

  if (response.status !== 201) {
    throw new Error(
      `beforeAll: failed to issue certificate — got ${response.status}: ${JSON.stringify(response.body)}`
    );
  }

  confirmedCertificateId = response.body.certificate.id;
});

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────

afterAll(async () => {
  // Clean up unique pdf fixtures
  const fixtureDir = path.resolve('test', 'fixtures');
  fs.readdirSync(fixtureDir)
    .filter(f => f.startsWith('revoke-') && f.endsWith('.pdf'))
    .forEach(f => fs.unlinkSync(path.join(fixtureDir, f)));


  try {
    const uploadsDir = path.resolve('uploads');

    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);

      for (const file of files) {
        // Construct absolute path to the file
        const filePath = path.join(uploadsDir, file);

        // Ensure it's a file before trying to delete it
        if (fs.statSync(filePath).isFile()) {
          fs.unlinkSync(filePath);
        }
      }
    }
  } catch (error) {
    // Uses structural fallback to avoid breaking test teardown logs
    console.warn('Failed to clean up uploads directory:', error.message);
  }


  await prisma.auditLog.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.student.deleteMany();
  await prisma.orgUser.deleteMany();
  await prisma.organisation.deleteMany();

  await prisma.$disconnect();
});

beforeEach(() => {
  jest.clearAllMocks();
  mockSendRevocationEmail.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Certificate Revocation Integration Tests', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // REVOKE CERTIFICATE
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /api/certificates/:id/revoke', () => {

    it('should return 400 when reason is missing', async () => {

      const response = await request(app)
        .post(`/api/certificates/${confirmedCertificateId}/revoke`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({ reason: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('revocation reason is required');

      // Certificate should remain untouched in DB
      const certificate = await prisma.certificate.findUnique({
        where: { id: confirmedCertificateId }
      });

      expect(certificate.status).toBe('CONFIRMED');
    });

    it('should return 400 when revoking without sending a reason at all', async () => {

      const response = await request(app)
        .post(`/api/certificates/${confirmedCertificateId}/revoke`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('revocation reason is required');
    });

    it('should return 403 when certificate belongs to a different org', async () => {

      // Create a second org and sign a token for it
      const otherOrg = await prisma.organisation.create({
        data: {
          name: 'Other University',
          code: `OTHER-${Date.now()}`,
          type: 'UNIVERSITY',
          country: 'Cameroon',
          city: 'Douala',
          official_email: `other${Date.now()}@gmail.com`,
          phone: '677000099',
          address: 'Other Address',
          status: 'APPROVED'
        }
      });

      const otherAdminToken = signAccessToken({
        userId: 'other-user-id',
        orgId: otherOrg.id,
        role: 'ORG_SUPER_ADMIN'
      });

      const response = await request(app)
        .post(`/api/certificates/${confirmedCertificateId}/revoke`)
        .set('Authorization', `Bearer ${otherAdminToken}`)
        .send({ reason: 'Trying to revoke another org certificate' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('Access denied');

      // Clean up the extra org
      await prisma.organisation.delete({ where: { id: otherOrg.id } });
    });

    it('should fully revoke a CONFIRMED certificate and persist to DB', async () => {

      mockRevokeOnChain.mockResolvedValue('0xrevoke-tx-hash');

      const response = await request(app)
        .post(`/api/certificates/${confirmedCertificateId}/revoke`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({ reason: 'Document was found to be fraudulent' });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('revoked successfully');
      expect(response.body.data.status).toBe('REVOKED');
      expect(response.body.data.tx_hash).toBe('0xrevoke-tx-hash');
      expect(response.body.data.revoke_reason).toBe('Document was found to be fraudulent');

      // Verify DB was updated
      const certificate = await prisma.certificate.findUnique({
        where: { id: confirmedCertificateId }
      });

      expect(certificate.status).toBe('REVOKED');
      expect(certificate.revoke_reason).toBe('Document was found to be fraudulent');
      expect(certificate.revoked_at).not.toBeNull();

      // Verify blockchain mock was called with the correct certId
      expect(mockRevokeOnChain).toHaveBeenCalledWith(confirmedCertificateId);

      // Verify revocation email was sent
      expect(mockSendRevocationEmail).toHaveBeenCalledTimes(1);
    });

    it('should return 400 when revoking an already-revoked certificate', async () => {

      // This test depends on the previous test having revoked the certificate
      const response = await request(app)
        .post(`/api/certificates/${confirmedCertificateId}/revoke`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .send({ reason: 'Trying to revoke again' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('already been revoked');

      // Blockchain should never be called for an already-revoked cert
      expect(mockRevokeOnChain).not.toHaveBeenCalled();
    });

  });

});