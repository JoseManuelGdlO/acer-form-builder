import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';

/** At least one of the listed permissions (OR). */
export const requireAnyPermission =
  (...keys: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const ok = keys.some((k) => req.user!.permissions.includes(k));
    if (!ok) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };

/** User must have every listed permission (AND). */
export const requireAllPermissions =
  (...keys: string[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const ok = keys.every((k) => req.user!.permissions.includes(k));
    if (!ok) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
