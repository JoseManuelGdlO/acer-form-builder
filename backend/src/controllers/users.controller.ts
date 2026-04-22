import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Branch, User, Role, Permission } from '../models';
import { hashPassword } from '../utils/password';
import { AuthRequest } from '../middleware/auth.middleware';

const roleIncludePermissions = {
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
};

function serializeUser(user: User): Record<string, unknown> {
  const role = (user as any).role as (Role & { permissions?: { key: string }[] }) | undefined;
  const permissionRows = role?.permissions;
  const permissions = Array.isArray(permissionRows)
    ? permissionRows.map((p) => p.key).filter(Boolean)
    : [];
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    roleId: (user as any).roleId,
    role: role
      ? {
          id: role.id,
          name: role.name,
          systemKey: role.systemKey,
        }
      : null,
    permissions,
    branchId: (user as any).branchId ?? null,
    branch: (user as any).branch
      ? {
          id: (user as any).branch.id,
          name: (user as any).branch.name,
          isActive: (user as any).branch.isActive,
        }
      : null,
    createdAt: user.createdAt,
  };
}

export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const users = await User.findAll({
      where: { companyId },
      include: [
        roleIncludePermissions,
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'isActive'],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    res.json(users.map((u) => serializeUser(u)));
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getUserById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const user = await User.findOne({
      where: { id, companyId },
      include: [
        roleIncludePermissions,
        {
          model: Branch,
          as: 'branch',
          attributes: ['id', 'name', 'isActive'],
        },
      ],
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(serializeUser(user));
  } catch (error) {
    console.error('Get user by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createUser = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').notEmpty().withMessage('Name is required'),
  body('roleId').isUUID().withMessage('roleId is required'),
  body('branchId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidV4Regex.test(String(value));
    })
    .withMessage('Invalid branchId'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, name, roleId } = req.body;
      const rawBranchId = req.body.branchId;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const role = await Role.findOne({ where: { id: roleId, companyId } });
      if (!role) {
        res.status(400).json({ error: 'Invalid role for this company' });
        return;
      }

      const existingUser = await User.findOne({ where: { email, companyId } });
      if (existingUser) {
        res.status(400).json({ error: 'User already exists in this company' });
        return;
      }

      let branchId: string | null = null;
      let branch: { id: string; name: string; isActive: boolean } | null = null;
      if (rawBranchId !== undefined && rawBranchId !== null && rawBranchId !== '') {
        const foundBranch = await Branch.findOne({ where: { id: rawBranchId, companyId } });
        if (!foundBranch || foundBranch.isActive === false) {
          res.status(400).json({ error: 'Invalid branchId for this company' });
          return;
        }
        branchId = rawBranchId;
        branch = { id: foundBranch.id, name: foundBranch.name, isActive: foundBranch.isActive };
      }

      const hashedPassword = await hashPassword(password);

      const user = await User.create({
        companyId,
        roleId,
        email,
        password: hashedPassword,
        name,
        status: 'active',
        branchId,
      });

      const full = await User.findByPk(user.id, {
        include: [roleIncludePermissions, { model: Branch, as: 'branch', attributes: ['id', 'name', 'isActive'] }],
      });

      res.status(201).json({
        ...serializeUser(full!),
        branch,
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
  body('roleId').optional().isUUID(),
  body('branchId')
    .optional({ nullable: true })
    .custom((value) => {
      if (value === '' || value === null || value === undefined) return true;
      const uuidV4Regex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidV4Regex.test(String(value));
    })
    .withMessage('Invalid branchId'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const { name, email, status, roleId, password } = req.body;
      const rawBranchId = req.body.branchId;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const user = await User.findOne({ where: { id, companyId } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (email && email !== user.email) {
        const existingUser = await User.findOne({ where: { email, companyId } });
        if (existingUser) {
          res.status(400).json({ error: 'Email already in use in this company' });
          return;
        }
      }

      if (name) user.name = name;
      if (email) user.email = email;
      if (status) user.status = status;
      if (roleId) {
        const role = await Role.findOne({ where: { id: roleId, companyId } });
        if (!role) {
          res.status(400).json({ error: 'Invalid role for this company' });
          return;
        }
        (user as any).roleId = roleId;
      }
      if (rawBranchId !== undefined) {
        if (rawBranchId === null || rawBranchId === '') {
          user.branchId = null;
        } else {
          const branch = await Branch.findOne({ where: { id: rawBranchId, companyId } });
          if (!branch || branch.isActive === false) {
            res.status(400).json({ error: 'Invalid branchId for this company' });
            return;
          }
          user.branchId = rawBranchId;
        }
      }
      if (password) {
        user.password = await hashPassword(password);
      }

      await user.save();

      const updatedUser = await User.findByPk(id, {
        include: [roleIncludePermissions, { model: Branch, as: 'branch', attributes: ['id', 'name', 'isActive'] }],
      });

      res.json(serializeUser(updatedUser!));
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (req.user?.id === id) {
      res.status(400).json({ error: 'Cannot delete your own account' });
      return;
    }

    const user = await User.findOne({ where: { id, companyId } });
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
