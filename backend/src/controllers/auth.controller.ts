import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User, Company, Role, Permission } from '../models';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, generatePermanentToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';

function buildAuthUserPayload(user: User): {
  id: string;
  email: string;
  name: string;
  status: string;
  role: { id: string; name: string; systemKey: string | null };
  permissions: string[];
  company: { id: string; name: string; slug: string; logoUrl: string | null } | null;
} {
  const role = (user as any).role as Role | undefined;
  const company = (user as any).company as Company | undefined;
  const permissionRows = (role as any)?.permissions as Permission[] | undefined;
  const permissions = permissionRows?.map((p) => p.key).filter(Boolean) || [];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    role: {
      id: role?.id || '',
      name: role?.name || '',
      systemKey: (role as any)?.systemKey ?? null,
    },
    permissions,
    company: company
      ? {
          id: company.id,
          name: company.name,
          slug: company.slug,
          logoUrl: (company as any).logoUrl ?? null,
        }
      : null,
  };
}

async function loadUserForAuth(userId: string): Promise<User | null> {
  return User.findByPk(userId, {
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
        attributes: ['id', 'name', 'slug', 'logoUrl'],
      },
    ],
  });
}

export const login = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password } = req.body;

      const user = await User.findOne({
        where: { email },
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
            attributes: ['id', 'name', 'slug', 'logoUrl'],
          },
        ],
      });

      if (!user) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      if (user.status !== 'active') {
        res.status(401).json({ error: 'Account is inactive' });
        return;
      }

      const isValidPassword = await comparePassword(password, user.password);
      if (!isValidPassword) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }

      const companyId = (user as any).companyId;
      const token = generateToken({
        userId: user.id,
        companyId,
        email: user.email,
      });

      res.json({
        token,
        user: buildAuthUserPayload(user),
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const register = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('companySlug').optional().isString(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name, companySlug } = req.body;

      const slug = companySlug || 'saru';
      const company = await Company.findOne({ where: { slug } });
      if (!company) {
        res.status(400).json({ error: 'Company not found. Provide a valid companySlug.' });
        return;
      }

      const existingUser = await User.findOne({ where: { email, companyId: company.id } });
      if (existingUser) {
        res.status(400).json({ error: 'User already exists in this company' });
        return;
      }

      const userCount = await User.count();
      const isFirstUser = userCount === 0;
      const systemKey = isFirstUser ? 'super_admin' : 'reviewer';

      const roleRow = await Role.findOne({
        where: { companyId: company.id, systemKey },
      });
      if (!roleRow) {
        res.status(500).json({ error: 'Company roles not configured. Run database migrations.' });
        return;
      }

      const hashedPassword = await hashPassword(password);

      const user = await User.create({
        companyId: company.id,
        roleId: roleRow.id,
        email,
        password: hashedPassword,
        name,
        status: 'active',
      });

      const fullUser = await loadUserForAuth(user.id);
      const token = generateToken({
        userId: user.id,
        companyId: company.id,
        email: user.email,
      });

      res.status(201).json({
        token,
        user: fullUser ? buildAuthUserPayload(fullUser) : buildAuthUserPayload(user as any),
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const me = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await loadUserForAuth(req.user.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      user: buildAuthUserPayload(user),
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getPermanentToken = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const user = await loadUserForAuth(req.user.id);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if (user.status !== 'active') {
      res.status(401).json({ error: 'Account is inactive' });
      return;
    }

    const companyId = (user as any).companyId;

    const token = generatePermanentToken({
      userId: user.id,
      companyId,
      email: user.email,
    });

    res.json({
      token,
      user: buildAuthUserPayload(user),
    });
  } catch (error) {
    console.error('getPermanentToken error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  res.json({ message: 'Logged out successfully' });
};
