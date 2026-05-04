import { signAccessToken, verifyAccessToken, verifyRefreshToken, signRefreshToken } from '../../service/jwtServices.js';
import jwt from 'jsonwebtoken';

describe('Auth Unit Tests', () => {
  describe('signAccessToken', () => {
    it('should return a string', () => {
      const payload = { userId: '123', role: 'SUPER_ADMIN' };
      const token = signAccessToken(payload);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });
  });

  describe('verifyAccessToken', () => {
    it('should return the original payload for a valid token', () => {
      const payload = { userId: '123', role: 'SUPER_ADMIN', email: 'test@example.com' };
      const token = signAccessToken(payload);
      const decoded = verifyAccessToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
      expect(decoded.email).toBe(payload.email);
    });

    it('should throw TokenExpiredError for an expired token', (done) => {
      const payload = { userId: '123', role: 'SUPER_ADMIN' };
      const expiredToken = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1ms' });
      
      // Wait a moment to ensure expiration
      setTimeout(() => {
        expect(() => {
          verifyAccessToken(expiredToken);
        }).toThrow();
        done();
      }, 100);
    });

    it('should throw for a token signed with the wrong secret', () => {
      const payload = { userId: '123', role: 'SUPER_ADMIN' };
      const wrongToken = jwt.sign(payload, 'wrong_secret', { expiresIn: '15m' });
      
      expect(() => {
        verifyAccessToken(wrongToken);
      }).toThrow();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should return the original payload for a valid token', () => {
      const payload = { userId: '123', role: 'ORG_SUPER_ADMIN' };
      const token = signRefreshToken(payload);
      const decoded = verifyRefreshToken(token);
      
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('authenticate middleware', () => {
    let authenticate;

    beforeAll(async () => {
      const mod = await import('../../middleware/authenticate.js');
      authenticate = mod.authenticate;
    });

    it('should call next() for a valid Bearer token', () => {
      const payload = { userId: '123', role: 'SUPER_ADMIN', email: 'test@example.com' };
      const token = signAccessToken(payload);
      
      let nextCalled = false;
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {};
      const next = () => { nextCalled = true; };

      authenticate(req, res, next);

      expect(nextCalled).toBe(true);
      expect(req.user).toBeDefined();
      expect(req.user.id).toBe(payload.userId);
      expect(req.user.role).toBe(payload.role);
    });

    it('should return 401 when no Authorization header is present', () => {
      let statusCode = null;
      let responseData = null;

      const req = {
        headers: {}
      };
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
        }
      };
      const next = () => {};

      authenticate(req, res, next);

      expect(statusCode).toBe(401);
      expect(responseData).toBeDefined();
    });
  });

  describe('authorise middleware', () => {
    let authorise;

    beforeAll(async () => {
      const mod = await import('../../middleware/authorise.js');
      authorise = mod.authorise;
    });

    it("should call next() for a SUPER_ADMIN user when authorise('SUPER_ADMIN') is applied", () => {
      const req = {
        user: {
          id: '123',
          role: 'SUPER_ADMIN'
        }
      };
      const res = {};
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const middleware = authorise('SUPER_ADMIN');
      middleware(req, res, next);

      expect(nextCalled).toBe(true);
    });

    it("should return 403 for an ORG_ADMIN user when authorise('SUPER_ADMIN') is applied", () => {
      const req = {
        user: {
          id: '123',
          role: 'ORG_ADMIN'
        }
      };
      let statusCode = null;
      let responseData = null;
      const res = {
        status: (code) => {
          statusCode = code;
          return res;
        },
        json: (data) => {
          responseData = data;
        }
      };
      let nextCalled = false;
      const next = () => { nextCalled = true; };

      const middleware = authorise('SUPER_ADMIN');
      middleware(req, res, next);

      expect(statusCode).toBe(403);
      expect(responseData).toBeDefined();
      expect(nextCalled).toBe(false);
    });
  });
});
