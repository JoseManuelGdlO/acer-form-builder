import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader } from '../utils/jwt';
import { User, Role, Permission, Company } from '../models';
import { JwtPayload } from '../types';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    companyId: string;
    email: string;
    name: string;
    roleId: string;
    roleName: string;
    systemKey: string | null;
    permissions: string[];
    company?: {
      advisorClientAccessMode: 'assigned_only' | 'company_wide';
    };
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

    const user = await User.findByPk(payload.userId, {
      attributes: ['id', 'companyId', 'roleId', 'email', 'name', 'status'],
      include: [
        {
          model: Role,
          as: 'role',
          attributes: ['id', 'name', 'systemKey'],
          include: [
            {
              model: Permission,
              as: 'permissions',
              attributes: ['key'],
              through: { attributes: [] },
            },
          ],
        },
        {
          model: Company,
          as: 'company',
          attributes: ['advisorClientAccessMode'],
        },
      ],
    });

    if (!user || user.status !== 'active') {
      res.status(401).json({ error: 'Invalid or inactive user' });
      return;
    }

    const userCompanyId = (user as any).companyId;
    if (!userCompanyId) {
      res.status(403).json({ error: 'User company not set' });
      return;
    }
    if (payload.companyId !== userCompanyId) {
      res.status(403).json({ error: 'Token does not match user company' });
      return;
    }

    const role = (user as any).role as Role | undefined;
    const permissionRows = (role as any)?.permissions as Permission[] | undefined;
    const permissions = permissionRows?.map((p) => p.key).filter(Boolean) || [];

    req.user = {
      id: user.id,
      companyId: userCompanyId,
      email: user.email,
      name: user.name,
      roleId: (user as any).roleId,
      roleName: role?.name || '',
      systemKey: (role as any)?.systemKey ?? null,
      permissions,
      company: {
        advisorClientAccessMode: ((user as any).company?.advisorClientAccessMode ?? 'assigned_only') as
          | 'assigned_only'
          | 'company_wide',
      },
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};
