import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User, UserRole as UserRoleModel } from '../models';
import { UserRole } from '../types';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth.middleware';

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
            model: UserRoleModel,
            as: 'roles',
            attributes: ['role'],
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

      const roles = (user as any).roles?.map((r: UserRoleModel) => r.role) || [];
      const token = generateToken({
        userId: user.id,
        email: user.email,
        roles,
      });

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
          roles,
        },
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
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      // Check if this is the first user (make them super_admin)
      const userCount = await User.count();
      const isFirstUser = userCount === 0;

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user
      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        status: 'active',
      });

      // Assign role (first user = super_admin, others = reviewer by default)
      const role: UserRole = isFirstUser ? 'super_admin' : 'reviewer';
      await UserRoleModel.create({
        userId: user.id,
        role,
      });

      const roles: UserRole[] = [role];
      const token = generateToken({
        userId: user.id,
        email: user.email,
        roles,
      });

      res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          status: user.status,
          roles,
        },
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

    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: UserRoleModel,
          as: 'roles',
          attributes: ['role'],
        },
      ],
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const roles = (user as any).roles?.map((r: UserRoleModel) => r.role) || [];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        roles,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const logout = async (_req: Request, res: Response): Promise<void> => {
  // JWT is stateless, so logout is handled client-side by removing the token
  // In a production app, you might want to implement a token blacklist
  res.json({ message: 'Logged out successfully' });
};
