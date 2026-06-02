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
const mockVerifyOnChain = jest.fn();
const mockSendCertificateIssuedEmail = jest.fn();

jest.unstable_mockModule('../../service/blockchainService.js', () => ({
  issueOnChain: mockIssueOnChain,
  verifyOnChain: mockVerifyOnChain,
  revokeOnChain: jest.fn(),
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
  sendRevocationEmail: jest.fn(),
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

// Catch multer/file errors and return proper 400
app.use((err, req, res, next) => {
  if (
    err.message === 'Only PDF, JPEG, and PNG files are allowed' ||
    err.message?.includes('must be a PDF')
  ) {
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
let failedCertificateId = null;

const txtPath = path.resolve('test', 'fixtures', 'not-pdf.txt');

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const createPayload = () => ({
  full_name: 'John Doe',
  matricule: `MAT-${Date.now()}`,
  email: `john${Date.now()}@gmail.com`,
  department: 'Computer Engineering',
  program: 'Software Engineering',
  year_of_entry: '2020',
  year_of_graduation: '2024',
  gpa: '3.8'
});
// Creates a unique fake PDF with a timestamp so each test gets a unique hash
const createUniquePdfPath = () => {
  const uniquePath = path.resolve('test', 'fixtures', `sample-${Date.now()}.pdf`);
  fs.writeFileSync(uniquePath, `%PDF-1.4 fake pdf content ${Date.now()} ${Math.random()}`);
  return uniquePath;
};

// ─────────────────────────────────────────────────────────────────────────────
// BEFORE ALL
// ─────────────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  org = await prisma.organisation.create({
    data: {
      name: 'Test University',
      code: `TU-${Date.now()}`,
      type: 'UNIVERSITY',
      country: 'Cameroon',
      city: 'Yaounde',
      official_email: `org${Date.now()}@gmail.com`,
      phone: '677000000',
      address: 'Test Address',
      status: 'APPROVED'
    }
  });

  superAdmin = await prisma.orgUser.create({
    data: {
      org_id: org.id,
      role: 'ORG_SUPER_ADMIN',
      full_name: 'Super Admin',
      job_title: 'Registrar',
      email: `admin${Date.now()}@gmail.com`,
      phone: '677111111',
      password_hash: hashedPassword,
      status: 'ACTIVE',
      reg_email_status: 'SENT'
    }
  });

  // ✅ Use 'userId' to match what authenticate middleware reads (decoded.userId)
  orgSuperAdminToken = signAccessToken({
    userId: superAdmin.id,
    orgId: org.id,
    role: superAdmin.role
  });

  // Ensure fixture directory exists
  const fixtureDir = path.resolve('test', 'fixtures');
  if (!fs.existsSync(fixtureDir)) {
    fs.mkdirSync(fixtureDir, { recursive: true });
  }


  // Create fake TXT file if missing
  if (!fs.existsSync(txtPath)) {
    fs.writeFileSync(txtPath, 'this is not a pdf');
  }

 
  mockSendCertificateIssuedEmail.mockResolvedValue(undefined);
});

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP
// ─────────────────────────────────────────────────────────────────────────────

afterAll(async () => {

  // Clean up any unique pdf fixtures generated during tests
  const fixtureDir = path.resolve('test', 'fixtures');
  fs.readdirSync(fixtureDir)
    .filter(f => f.startsWith('sample-') && f.endsWith('.pdf'))
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


  // Clean up database data (in reverse order of foreign key dependencies)
  try {
    await prisma.auditLog.deleteMany();
    await prisma.certificate.deleteMany();
    await prisma.student.deleteMany();
    await prisma.orgUser.deleteMany();
    await prisma.organisation.deleteMany();
  } catch (error) {
    console.error('Error cleaning up issuance test data:', error);
  }

  // Do NOT disconnect - let global teardown handle it
});

beforeEach(() => {
  jest.clearAllMocks();

  
  mockSendCertificateIssuedEmail.mockResolvedValue(undefined);

  // Suppress console.error during tests (to reduce noise from intentional error handling tests)
  jest.spyOn(console, 'error').mockImplementation(() => { });
});

afterEach(() => {
  console.error.mockRestore();
});

// ─────────────────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────────────────

describe('Certificate Issuance Integration Tests', () => {

  // ───────────────────────────────────────────────────────────────────────────
  // ISSUE CERTIFICATE
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /api/certificates', () => {

    it('should issue certificate successfully and confirm it on-chain', async () => {

      mockIssueOnChain.mockResolvedValue('0x1234567890abcdef');
      mockVerifyOnChain.mockResolvedValue({ exists: true });

      const payload = createPayload();

      const uniquePdf = createUniquePdfPath();

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .field('full_name', payload.full_name)
        .field('matricule', payload.matricule)
        .field('email', payload.email)
        .field('department', payload.department)
        .field('program', payload.program)
        .field('year_of_entry', payload.year_of_entry)
        .field('year_of_graduation', payload.year_of_graduation)
        .field('gpa', payload.gpa)
        .attach('certificate_pdf', uniquePdf);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('Certificate issued successfully');
      expect(response.body.certificate.status).toBe('CONFIRMED');
      expect(response.body.certificate.tx_hash).toBe('0x1234567890abcdef');

      const certificate = await prisma.certificate.findUnique({
        where: { id: response.body.certificate.id }
      });

      expect(certificate).not.toBeNull();
      expect(certificate.status).toBe('CONFIRMED');
    });

    it('should handle blockchain failure path correctly', async () => {

      mockIssueOnChain.mockRejectedValue(new Error('Blockchain RPC failed'));
      const uniquePdf = createUniquePdfPath();
      const payload = createPayload();

      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .field('full_name', payload.full_name)
        .field('matricule', payload.matricule)
        .field('email', payload.email)
        .field('department', payload.department)
        .field('program', payload.program)
        .field('year_of_entry', payload.year_of_entry)
        .field('year_of_graduation', payload.year_of_graduation)
        .field('gpa', payload.gpa)
        .attach('certificate_pdf', uniquePdf);

      expect(response.status).toBe(202);
      expect(response.body.certificate.status).toBe('FAILED');

      failedCertificateId = response.body.certificate.id;

      const certificate = await prisma.certificate.findUnique({
        where: { id: failedCertificateId }
      });

      expect(certificate.status).toBe('FAILED');

      const student = await prisma.student.findFirst({
        where: { email: payload.email.toLowerCase() }
      });

      expect(student).not.toBeNull();
    });

    it('should return 400 when a required field is missing', async () => {
      const uniquePdf = createUniquePdfPath();
      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .field('matricule', 'MAT-001')
        .field('email', 'test@gmail.com')
        .field('department', 'Engineering')
        .field('program', 'Software Engineering')
        .field('year_of_entry', '2020')
        .field('year_of_graduation', '2024')
        .field('gpa', '3.5')
        .attach('certificate_pdf', uniquePdf);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Missing required fields');
      expect(response.body.fields).toContain('full_name');
    });

    it('should return 400 when the uploaded file is not a PDF', async () => {

      const payload = createPayload();
      const response = await request(app)
        .post('/api/certificates')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`)
        .field('full_name', payload.full_name)
        .field('matricule', payload.matricule)
        .field('email', payload.email)
        .field('department', payload.department)
        .field('program', payload.program)
        .field('year_of_entry', payload.year_of_entry)
        .field('year_of_graduation', payload.year_of_graduation)
        .field('gpa', payload.gpa)
        .attach('certificate_pdf', txtPath);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('must be a PDF');
    });

  });

  // ───────────────────────────────────────────────────────────────────────────
  // RETRY CERTIFICATE
  // ───────────────────────────────────────────────────────────────────────────

  describe('POST /api/certificates/:id/retry', () => {

    it('should update status to CONFIRMED for a FAILED certificate', async () => {

      if (!failedCertificateId) {
        const student = await prisma.student.create({
          data: {
            org_id: org.id,
            full_name: 'Retry Student',
            matricule: `RET-${Date.now()}`,
            email: `retry${Date.now()}@gmail.com`
          }
        });

        const failedCert = await prisma.certificate.create({
          data: {
            org_id: org.id,
            student_id: student.id,
            issued_by_id: superAdmin.id,
            department: 'Engineering',
            program: 'Computer Science',
            year_of_entry: 2020,
            year_of_graduation: 2024,
            gpa: 3.5,
            certificate_hash: `retry-hash-${Date.now()}`,
            cloudinary_url: 'https://fake-url.com/cert.pdf',
            status: 'FAILED'
          }
        });

        failedCertificateId = failedCert.id;
      }

      mockVerifyOnChain.mockResolvedValue({ exists: false });
      mockIssueOnChain.mockResolvedValue('0x1234567890abcdef');

      const response = await request(app)
        .post(`/api/certificates/${failedCertificateId}/retry`)
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('successfully confirmed');
      expect(response.body.certificate.status).toBe('CONFIRMED');
      expect(response.body.certificate.tx_hash).toBe('0x1234567890abcdef');

      const updatedCert = await prisma.certificate.findUnique({
        where: { id: failedCertificateId }
      });

      expect(updatedCert.status).toBe('CONFIRMED');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // GET CERTIFICATES
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /api/certificates', () => {

    it('should return all org certificates regardless of which admin issued them', async () => {

      const hashedPassword = await bcrypt.hash('password123', 10);

      const secondAdmin = await prisma.orgUser.create({
        data: {
          org_id: org.id,
          role: 'ORG_ADMIN',
          full_name: 'Second Admin',
          job_title: 'Dean',
          email: `second${Date.now()}@gmail.com`,
          phone: '677222222',
          password_hash: hashedPassword,
          status: 'ACTIVE',
          reg_email_status: 'SENT'
        }
      });

      const student = await prisma.student.create({
        data: {
          org_id: org.id,
          full_name: 'Another Student',
          matricule: `MAT-${Date.now()}`,
          email: `student${Date.now()}@gmail.com`
        }
      });

      await prisma.certificate.create({
        data: {
          id: crypto.randomUUID(),
          org_id: org.id,
          student_id: student.id,
          issued_by_id: secondAdmin.id,
          department: 'Engineering',
          program: `Cyber Security ${Date.now()}`,
          year_of_entry: 2020,
          year_of_graduation: 2024,
          gpa: 3.7,
          certificate_hash: `hash-${Date.now()}`,
          cloudinary_url: 'https://fake-url.com/cert.pdf',
          status: 'CONFIRMED'
        }
      });

      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', `Bearer ${orgSuperAdminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

  });

  // ───────────────────────────────────────────────────────────────────────────
  // AUTH TESTS
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /api/certificates (authentication)', () => {

    it('should return 401 without a token', async () => {
      const response = await request(app).get('/api/certificates');
      expect(response.status).toBe(401);
    });

    it('should return 401 with an invalid token', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', 'Bearer invalidtoken');
      expect(response.status).toBe(401);
    });

    it('should return 401 with malformed Authorization header', async () => {
      const response = await request(app)
        .get('/api/certificates')
        .set('Authorization', 'InvalidFormat');
      expect(response.status).toBe(401);
    });

  });

});

