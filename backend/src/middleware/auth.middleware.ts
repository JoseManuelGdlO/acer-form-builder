import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { User, UserRole } from '../models';
import { JwtPayload } from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    roles: string[];
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const payload = verifyToken(token) as JwtPayload;

    // Fetch user with roles from database
    const user = await User.findByPk(payload.userId, {
      include: [
        {
          model: UserRole,
          as: 'roles',
          attributes: ['role'],
        },
      ],
    });

    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'Invalid or inactive user' });
      return;
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      roles: (user as any).roles?.map((r: UserRole) => r.role) || [],
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
