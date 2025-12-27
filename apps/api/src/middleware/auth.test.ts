import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, optionalAuth, getUserIdFromAuth, AuthenticatedRequest } from './auth';

// Mock jwt
vi.mock('jsonwebtoken');

describe('Auth Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });
    mockReq = {
      headers: {},
    };
    mockRes = {
      status: statusMock,
      json: jsonMock,
    };
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 if no authorization header', () => {
      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header does not start with Bearer', () => {
      mockReq.headers = { authorization: 'Basic token123' };

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Unauthorized' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 if token is invalid', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(401);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid token' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next and set userId if token is valid', () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(jwt.verify).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      } as never);

      requireAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).userId).toBe('user-123');
      expect((mockReq as AuthenticatedRequest).userEmail).toBe('test@example.com');
    });
  });

  describe('optionalAuth', () => {
    it('should call next without userId if no token', () => {
      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).userId).toBeUndefined();
    });

    it('should call next with userId if valid token', () => {
      mockReq.headers = { authorization: 'Bearer valid-token' };
      vi.mocked(jwt.verify).mockReturnValue({
        userId: 'user-123',
        email: 'test@example.com',
      } as never);

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).userId).toBe('user-123');
    });

    it('should call next without userId if invalid token', () => {
      mockReq.headers = { authorization: 'Bearer invalid-token' };
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect((mockReq as AuthenticatedRequest).userId).toBeUndefined();
    });
  });

  describe('getUserIdFromAuth', () => {
    it('should return null if no auth header', () => {
      expect(getUserIdFromAuth(undefined)).toBeNull();
    });

    it('should return null if auth header does not start with Bearer', () => {
      expect(getUserIdFromAuth('Basic token123')).toBeNull();
    });

    it('should return null if token is invalid', () => {
      vi.mocked(jwt.verify).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(getUserIdFromAuth('Bearer invalid-token')).toBeNull();
    });

    it('should return userId if token is valid', () => {
      vi.mocked(jwt.verify).mockReturnValue({
        userId: 'user-123',
      } as never);

      expect(getUserIdFromAuth('Bearer valid-token')).toBe('user-123');
    });
  });
});
