import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/security.js';
import { storage } from '../services/storage.js';
import { User, UserRole } from '../models/types.js';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication token required' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyAccessToken(token);

  if (!decoded || !decoded.userId) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
    return;
  }

  const user = storage.findUserById(decoded.userId);
  if (!user) {
    res.status(401).json({ success: false, error: 'User not found' });
    return;
  }

  req.user = user;
  next();
};

export const requireRole = (...roles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.primaryRole)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: ${roles.join(', ')}`
      });
      return;
    }

    next();
  };
};
