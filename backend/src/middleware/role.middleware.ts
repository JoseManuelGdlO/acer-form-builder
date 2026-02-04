import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { UserRole } from '../types';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      console.log('[role.middleware] 401: sin usuario', { path: req.originalUrl, method: req.method });
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const userRoles = req.user.roles as UserRole[];
    const hasRole = userRoles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      console.log('[role.middleware] 403: permisos insuficientes', {
        path: req.originalUrl,
        method: req.method,
        userId: req.user.userId,
        userRoles,
        allowedRoles,
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole('super_admin');
