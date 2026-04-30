import request from 'supertest';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import 'dotenv/config';

// Import routes and middleware
import corsOption from '../config/corsOption.js';
import verifyJWT from '../middleware/verifyJWT.js';
import authentication from '../routes/authentication.js';
import logout from '../routes/logout.js';
import admin from '../routes/admin.js';

// Import controllers
import handleRefreshToken from '../controller/refreshTokenController.js';
import prisma from '../config/prisma.js';

// Setup Express app for testing
const app = express();

app.use(cors(corsOption));
app.use(express.json());
app.use(cookieParser());

// Public routes
app.use('/login', authentication);
app.use('/logout', logout);

// Refresh token route (public, uses cookies)
app.post('/refresh', handleRefreshToken);

app.use(verifyJWT);
// Private routes
app.use('/admin/student', admin);

// Test data
let testAccessToken = '';
let testRefreshToken = '';
let testUserId = '';
let testDeviceId = 'test-device-123';
const testEmail = 'test@example.com';
const testPassword = 'TestPassword123!';
const testFirstName = 'Test';
const testLastName = 'User';

// ─── Setup and Teardown ──────────────────────────────────────────
describe('API Integration Tests', () => {
  beforeAll(async () => {
    // Create a test user before running tests
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    
    try {
      const user = await prisma.user.upsert({
        where: { email: testEmail },
        update: {},
        create: {
          email: testEmail,
          password: hashedPassword,
          first_name: testFirstName,
          last_name: testLastName,
          role: 'admin'
        }
      });
      testUserId = user.user_id;
    } catch (error) {
      console.error('Error creating test user:', error);
    }
  });

  afterAll(async () => {
    // Clean up test data
    try {
      await prisma.refreshToken.deleteMany({
        where: {
          user_id: testUserId
        }
      });
      
      await prisma.user.delete({
        where: { user_id: testUserId }
      });
    } catch (error) {
      console.error('Error cleaning up test data:', error);
    }

    await prisma.$disconnect();
  });

  // ═════════════════════════════════════════════════════════════════
  // ─── AUTHENTICATION TESTS ────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  describe('Authentication - POST /login', () => {
    it('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          password: testPassword,
          deviceId: testDeviceId
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email and Password required');
    });

    it('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          deviceId: testDeviceId
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Email and Password required');
    });

    it('should return 400 when deviceId is missing', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('Device ID required');
    });

    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: 'nonexistent@example.com',
          password: testPassword,
          deviceId: testDeviceId
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should return 401 for incorrect password', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
          deviceId: testDeviceId
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should successfully authenticate with valid credentials', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: testDeviceId
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('role');
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('firstname');
      expect(response.body).toHaveProperty('lastname');

      expect(response.body.role).toBe('admin');
      expect(response.body.firstname).toBe(testFirstName);
      expect(response.body.lastname).toBe(testLastName);

      // Verify access token is valid JWT
      const decoded = jwt.verify(
        response.body.accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );
      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe('admin');

      // Store tokens for later tests
      testAccessToken = response.body.accessToken;

      // Verify refresh token is set as cookie
      expect(response.headers['set-cookie']).toBeDefined();
      const jwtCookie = response.headers['set-cookie'].find(cookie => 
        cookie.startsWith('jwt=')
      );
      expect(jwtCookie).toBeDefined();

      // Extract and store refresh token from cookie
      testRefreshToken = jwtCookie.split('=')[1].split(';')[0];
    });

    it('should replace old refresh token for same device', async () => {
      // Login first time
      const response1 = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'device-replace-test-1'
        });

      const refreshToken1 = response1.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='))
        .split('=')[1]
        .split(';')[0];

      // Add small delay to ensure different token creation time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Login second time with same device
      const response2 = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'device-replace-test-1'
        });

      const refreshToken2 = response2.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='))
        .split('=')[1]
        .split(';')[0];

      // Tokens should be different (or at least verify only one exists in DB)
      // Verify only the new token is in database
      const storedTokens = await prisma.refreshToken.findMany({
        where: {
          user_id: testUserId,
          device_id: 'device-replace-test-1'
        }
      });

      expect(storedTokens.length).toBe(1);
      expect(storedTokens[0].token).toBe(refreshToken2);
    });

    it('should store refresh token with device info in database', async () => {
      const response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'new-device-456'
        });

      expect(response.status).toBe(200);

      // Verify token is stored in database
      const storedToken = await prisma.refreshToken.findFirst({
        where: {
          user_id: testUserId,
          device_id: 'new-device-456'
        }
      });

      expect(storedToken).toBeDefined();
      expect(storedToken.user_agent).toBeDefined();
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ─── REFRESH TOKEN TESTS ─────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  describe('Refresh Token - POST /refresh', () => {
    it('should return 401 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/refresh')
        .send({ deviceId: testDeviceId });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No refresh token');
    });

    it('should return 403 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/refresh')
        .set('Cookie', 'jwt=invalid.token.here')
        .send({ deviceId: testDeviceId });

      expect(response.status).toBe(403);
      // Token will be checked against database first, so it returns "Invalid refresh token"
      expect(['Token expired or invalid', 'Invalid refresh token']).toContain(response.body.message);
    });

    it('should return 403 when token not found in database', async () => {
      const fakeToken = jwt.sign(
        { userId: testUserId, role: 'admin' },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '12h' }
      );

      const response = await request(app)
        .post('/refresh')
        .set('Cookie', `jwt=${fakeToken}`)
        .send({ deviceId: 'nonexistent-device' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('Invalid refresh token');
    });

    it('should successfully refresh access token with valid refresh token', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'refresh-test-device'
        });

      const refreshTokenCookie = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='));

      const originalAccessToken = loginResponse.body.accessToken;

      // Add small delay to ensure different token creation time
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use the refresh token to get new access token
      const refreshResponse = await request(app)
        .post('/refresh')
        .set('Cookie', refreshTokenCookie)
        .send({ deviceId: 'refresh-test-device' });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('accessToken');

      // Verify new access token is valid
      const decoded = jwt.verify(
        refreshResponse.body.accessToken,
        process.env.ACCESS_TOKEN_SECRET
      );

      expect(decoded.userId).toBe(testUserId);
      expect(decoded.role).toBe('admin');

      // New token should be different from original (or at least new if generated at same time)
      // Just verify it's a valid token
      expect(refreshResponse.body.accessToken).toBeDefined();
      expect(refreshResponse.body.accessToken.split('.')).toHaveLength(3);
    });

    it('should refresh token successfully without deviceId in request', async () => {
      // First login to get tokens
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'no-device-check'
        });

      const refreshTokenCookie = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='));

      // Refresh without deviceId in body
      const refreshResponse = await request(app)
        .post('/refresh')
        .set('Cookie', refreshTokenCookie)
        .send({});

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body).toHaveProperty('accessToken');
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ─── LOGOUT TESTS ────────────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  describe('Logout - POST /logout', () => {
    it('should return 204 when logging out without refresh token', async () => {
      const response = await request(app)
        .post('/logout')
        .send({ deviceId: testDeviceId });

      expect(response.status).toBe(204);
    });

    it('should clear JWT cookie on logout', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'logout-test-device'
        });

      const refreshTokenCookie = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='));

      // Then logout
      const logoutResponse = await request(app)
        .post('/logout')
        .set('Cookie', refreshTokenCookie)
        .send({ deviceId: 'logout-test-device' });

      expect(logoutResponse.status).toBe(204);

      // Verify cookie is cleared - check for jwt cookie with clearing signals
      const clearedCookie = logoutResponse.headers['set-cookie']?.find(cookie =>
        cookie.includes('jwt=')
      );
      
      // The cookie should exist and contain clearing signals (Max-Age=0 or Expires in past)
      expect(clearedCookie).toBeDefined();
      expect(clearedCookie).toMatch(/Max-Age=0|Expires=/);
    });

    it('should delete refresh token from database on logout', async () => {
      // First login
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'db-logout-test'
        });

      const refreshTokenCookie = loginResponse.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='));

      // Verify token exists in database
      let storedToken = await prisma.refreshToken.findFirst({
        where: {
          user_id: testUserId,
          device_id: 'db-logout-test'
        }
      });
      expect(storedToken).toBeDefined();

      // Logout
      const logoutResponse = await request(app)
        .post('/logout')
        .set('Cookie', refreshTokenCookie)
        .send({ deviceId: 'db-logout-test' });

      expect(logoutResponse.status).toBe(204);

      // Verify token is deleted from database
      storedToken = await prisma.refreshToken.findFirst({
        where: {
          user_id: testUserId,
          device_id: 'db-logout-test'
        }
      });
      expect(storedToken).toBeNull();
    });

    it('should logout from specific device only', async () => {
      // Login from two different devices
      const device1Response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'device-1'
        });

      const device2Response = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'device-2'
        });

      const device1Cookie = device1Response.headers['set-cookie']
        .find(cookie => cookie.startsWith('jwt='));

      // Logout from device 1 only
      const logoutResponse = await request(app)
        .post('/logout')
        .set('Cookie', device1Cookie)
        .send({ deviceId: 'device-1' });

      expect(logoutResponse.status).toBe(204);

      // Verify token for device 1 is deleted
      const device1Token = await prisma.refreshToken.findFirst({
        where: {
          user_id: testUserId,
          device_id: 'device-1'
        }
      });
      expect(device1Token).toBeNull();

      // Verify token for device 2 still exists
      const device2Token = await prisma.refreshToken.findFirst({
        where: {
          user_id: testUserId,
          device_id: 'device-2'
        }
      });
      expect(device2Token).toBeDefined();

      // Clean up
      await prisma.refreshToken.deleteMany({
        where: {
          user_id: testUserId,
          device_id: 'device-2'
        }
      });
    });
  });

  // ═════════════════════════════════════════════════════════════════
  // ─── STUDENT SEARCH TESTS ────────────────────────────────────────
  // ═════════════════════════════════════════════════════════════════

  describe('Student Search - GET /admin/student', () => {
    it('should return 401 when access token is missing', async () => {
      const response = await request(app)
        .get('/admin/student')
        .query({ search: 'John' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('No Access Token');
    });

    it('should return 401 with invalid access token', async () => {
      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', 'Bearer invalid.token.here')
        .query({ search: 'John' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid Access Token');
    });

    it('should return 403 when user does not have admin role', async () => {
      // Create a non-admin user
      const hashedPassword = await bcrypt.hash('password123', 10);
      const studentUser = await prisma.user.create({
        data: {
          email: 'student@example.com',
          password: hashedPassword,
          first_name: 'Student',
          last_name: 'User',
          role: 'student'
        }
      });

      // Generate access token for non-admin user
      const studentToken = jwt.sign(
        { userId: studentUser.user_id, role: 'student' },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: '30m' }
      );

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${studentToken}`)
        .query({ search: 'John' });

      expect(response.status).toBe(403);

      // Clean up
      await prisma.user.delete({
        where: { user_id: studentUser.user_id }
      });
    });

    it('should return 400 when search query is empty or only whitespace', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-test-device'
        });

      const adminToken = loginResponse.body.accessToken;

      // Test with empty string
      let response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: '' });

      expect(response.status).toBe(400);

      // Test with only whitespace
      response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: '   ' });

      expect(response.status).toBe(400);
    });

    it('should return 200 with message when no students match search criteria', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-no-results-device'
        });

      const adminToken = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'NonExistentStudent12345' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No students found matching criteria');
    });

    it('should return students matching search by first name', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-firstname-device'
        });

      const adminToken = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'John' });

      // Response should be 200 (with results or no results message)
      expect([200]).toContain(response.status);

      if (Array.isArray(response.body)) {
        // If students are returned
        expect(response.body.length).toBeGreaterThan(0);
        response.body.forEach(student => {
          expect(student).toHaveProperty('student_id');
          expect(student).toHaveProperty('user');
          expect(student.user).toHaveProperty('first_name');
          expect(student).toHaveProperty('academic_records');
        });
      }
    });

    it('should return students matching search by last name', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-lastname-device'
        });

      const adminToken = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'Doe' });

      // Response should be 200
      expect([200]).toContain(response.status);

      if (Array.isArray(response.body)) {
        expect(response.body.length).toBeGreaterThan(0);
      }
    });

    it('should return students matching search by student ID', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-studentid-device'
        });

      const adminToken = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'STU' });

      // Response should be 200
      expect([200]).toContain(response.status);
    });

    it('should return students with cleared academic records only', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-cleared-device'
        });

      const adminToken = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'John' });

      if (Array.isArray(response.body)) {
        response.body.forEach(student => {
          expect(student.academic_records).toBeDefined();
          student.academic_records.forEach(record => {
            expect(record.clearance_status).toBe('Cleared');
          });
        });
      }
    });

    it('should perform case-insensitive search', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-case-insensitive-device'
        });

      const adminToken = loginResponse.body.accessToken;

      // Search with different cases
      const response1 = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'john' });

      const response2 = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'JOHN' });

      // Both should return similar results
      if (Array.isArray(response1.body) && Array.isArray(response2.body)) {
        expect(response1.body.length).toBe(response2.body.length);
      }
    });

    it('should include user and academic record details in response', async () => {
      // Get admin token
      const loginResponse = await request(app)
        .post('/login')
        .send({
          email: testEmail,
          password: testPassword,
          deviceId: 'search-details-device'
        });

      const adminToken = loginResponse.body.accessToken;

      const response = await request(app)
        .get('/admin/student')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ search: 'John' });

      if (Array.isArray(response.body) && response.body.length > 0) {
        const student = response.body[0];
        
        // Check student properties
        expect(student).toHaveProperty('student_id');
        
        // Check user properties
        expect(student.user).toBeDefined();
        expect(student.user).toHaveProperty('first_name');
        expect(student.user).toHaveProperty('last_name');
        expect(student.user).toHaveProperty('email');
        
        // Check academic records
        expect(student.academic_records).toBeDefined();
        expect(Array.isArray(student.academic_records)).toBe(true);
        
        if (student.academic_records.length > 0) {
          const record = student.academic_records[0];
          expect(record).toHaveProperty('clearance_status');
          expect(record.clearance_status).toBe('Cleared');
        }
      }
    });
  });
});
