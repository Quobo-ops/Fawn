import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

export interface AuthenticatedRequest extends Request {
  userId: string;
  userEmail: string;
}

/**
 * Middleware to authenticate JWT tokens
 * Adds userId and userEmail to the request object
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

    (req as AuthenticatedRequest).userId = decoded.userId;
    (req as AuthenticatedRequest).userEmail = decoded.email;

    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Helper function to get userId from auth header (for backwards compatibility)
 */
export function getUserIdFromAuth(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

/**
 * Optional auth middleware - does not reject if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };

      (req as AuthenticatedRequest).userId = decoded.userId;
      (req as AuthenticatedRequest).userEmail = decoded.email;
    } catch {
      // Token invalid, but we continue anyway
    }
  }

  next();
}
