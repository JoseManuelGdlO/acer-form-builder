import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User, UserRole } from '../models';
import { hashPassword } from '../utils/password';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const users = await User.findAll({
      include: [
        {
          model: UserRole,
          as: 'roles',
          attributes: ['role'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    const usersWithRoles = users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles: (user as any).roles?.map((r: UserRole) => r.role) || [],
      createdAt: user.createdAt,
    }));

    res.json(usersWithRoles);
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: [
        {
          model: UserRole,
          as: 'roles',
          attributes: ['role'],
        },
      ],
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const roles = (user as any).roles?.map((r: UserRole) => r.role) || [];

    res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      roles,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('role').isIn(['super_admin', 'reviewer']).withMessage('Invalid role'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name, role } = req.body;

      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        res.status(400).json({ error: 'User already exists' });
        return;
      }

      const hashedPassword = await hashPassword(password);

      const user = await User.create({
        email,
        password: hashedPassword,
        name,
        status: 'active',
      });

      await UserRole.create({
        userId: user.id,
        role,
      });

      res.status(201).json({
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status,
        roles: [role],
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateUser = [
  body('name').optional().notEmpty(),
  body('email').optional().isEmail().normalizeEmail(),
  body('status').optional().isIn(['active', 'inactive']),
  body('role').optional().isIn(['super_admin', 'reviewer']),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { name, email, status, role, password } = req.body;

      const user = await User.findByPk(id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Check if email is being changed and if it's already taken
      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
          res.status(400).json({ error: 'Email already in use' });
          return;
        }
      }

      if (name) user.name = name;
      if (email) user.email = email;
      if (status) user.status = status;
      if (password) {
        user.password = await hashPassword(password);
      }

      await user.save();

      // Update role if provided
      if (role) {
        await UserRole.destroy({ where: { userId: id } });
        await UserRole.create({ userId: id, role });
      }

      const updatedUser = await User.findByPk(id, {
        include: [
          {
            model: UserRole,
            as: 'roles',
            attributes: ['role'],
          },
        ],
      });

      const roles = (updatedUser as any).roles?.map((r: UserRole) => r.role) || [];

      res.json({
        id: updatedUser!.id,
        email: updatedUser!.email,
        name: updatedUser!.name,
        status: updatedUser!.status,
        roles,
        createdAt: updatedUser!.createdAt,
      });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Prevent deleting yourself
    if (req.user?.id === id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findByPk(id);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
