import { Response } from 'express';
import { body, param, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Role, RolePermission, Permission, User } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { PERMISSION_GROUPS } from '../authorization/permissions.catalog';
import { hasPermission } from '../authorization/policies';
import sequelize from '../config/database';

export const getPermissionCatalog = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user?.companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'roles.view')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    res.json({ groups: PERMISSION_GROUPS });
  } catch (error) {
    console.error('getPermissionCatalog error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listRoles = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user?.permissions, 'roles.view')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const roles = await Role.findAll({
      where: { companyId },
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['key'],
          through: { attributes: [] },
        },
      ],
      order: [['name', 'ASC']],
    });
    res.json(
      roles.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        systemKey: r.systemKey,
        permissions: ((r as any).permissions as Permission[]).map((p) => p.key),
      }))
    );
  } catch (error) {
    console.error('listRoles error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createRole = [
  body('name').trim().notEmpty().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('permissionKeys').isArray(),
  body('permissionKeys.*').isString(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!hasPermission(req.user!.permissions, 'roles.create')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      const { name, description, permissionKeys } = req.body as {
        name: string;
        description?: string;
        permissionKeys: string[];
      };

      const keys = [...new Set(permissionKeys)];
      const perms = await Permission.findAll({ where: { key: { [Op.in]: keys } } });
      if (perms.length !== keys.length) {
        res.status(400).json({ error: 'One or more permission keys are invalid' });
        return;
      }

      const role = await sequelize.transaction(async (t) => {
        const r = await Role.create(
          {
            companyId,
            name,
            description: description ?? null,
            isSystem: false,
            systemKey: null,
          },
          { transaction: t }
        );
        await RolePermission.bulkCreate(
          perms.map((p) => ({
            roleId: r.id,
            permissionId: p.id,
          })),
          { transaction: t }
        );
        return r;
      });

      const full = await Role.findByPk(role.id, {
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['key'],
            through: { attributes: [] },
          },
        ],
      });
      res.status(201).json({
        id: full!.id,
        name: full!.name,
        description: full!.description,
        isSystem: full!.isSystem,
        systemKey: full!.systemKey,
        permissions: ((full as any).permissions as Permission[]).map((p) => p.key),
      });
    } catch (error) {
      console.error('createRole error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateRole = [
  param('id').isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 120 }),
  body('description').optional().isString().isLength({ max: 500 }),
  body('permissionKeys').optional().isArray(),
  body('permissionKeys.*').optional().isString(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      if (!hasPermission(req.user!.permissions, 'roles.update')) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }
      const { id } = req.params;
      const role = await Role.findOne({ where: { id, companyId } });
      if (!role) {
        res.status(404).json({ error: 'Role not found' });
        return;
      }
      if (role.isSystem) {
        res.status(400).json({ error: 'System roles cannot be modified' });
        return;
      }

      const { name, description, permissionKeys } = req.body as {
        name?: string;
        description?: string;
        permissionKeys?: string[];
      };

      if (permissionKeys) {
        const keys = [...new Set(permissionKeys)];
        const perms = await Permission.findAll({ where: { key: { [Op.in]: keys } } });
        if (perms.length !== keys.length) {
          res.status(400).json({ error: 'One or more permission keys are invalid' });
          return;
        }
        await sequelize.transaction(async (t) => {
          await RolePermission.destroy({ where: { roleId: role.id }, transaction: t });
          await RolePermission.bulkCreate(
            perms.map((p) => ({ roleId: role.id, permissionId: p.id })),
            { transaction: t }
          );
        });
      }

      if (name !== undefined) role.name = name;
      if (description !== undefined) role.description = description || null;
      await role.save();

      const full = await Role.findByPk(role.id, {
        include: [
          {
            model: Permission,
            as: 'permissions',
            attributes: ['key'],
            through: { attributes: [] },
          },
        ],
      });
      res.json({
        id: full!.id,
        name: full!.name,
        description: full!.description,
        isSystem: full!.isSystem,
        systemKey: full!.systemKey,
        permissions: ((full as any).permissions as Permission[]).map((p) => p.key),
      });
    } catch (error) {
      console.error('updateRole error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    if (!hasPermission(req.user!.permissions, 'roles.delete')) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    const { id } = req.params;
    const role = await Role.findOne({ where: { id, companyId } });
    if (!role) {
      res.status(404).json({ error: 'Role not found' });
      return;
    }
    if (role.isSystem) {
      res.status(400).json({ error: 'System roles cannot be deleted' });
      return;
    }
    const inUse = await User.count({ where: { roleId: id } });
    if (inUse > 0) {
      res.status(400).json({ error: 'Role is assigned to users; reassign them before deleting' });
      return;
    }
    await role.destroy();
    res.json({ message: 'Role deleted' });
  } catch (error) {
    console.error('deleteRole error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
