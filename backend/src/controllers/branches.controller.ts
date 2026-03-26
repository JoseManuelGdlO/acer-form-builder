import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Branch } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getAllBranches = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const branches = await Branch.findAll({
      where: { companyId },
      order: [['name', 'ASC']],
    });

    res.json(branches);
  } catch (error) {
    console.error('Get branches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createBranch = [
  body('name').notEmpty().withMessage('Name is required'),
  body('isActive').optional().isBoolean(),
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

      const name = String(req.body.name).trim();
      const isActive = req.body.isActive !== undefined ? Boolean(req.body.isActive) : true;

      const existing = await Branch.findOne({ where: { companyId, name } });
      if (existing) {
        res.status(400).json({ error: 'Branch name already exists for this company' });
        return;
      }

      const branch = await Branch.create({
        companyId,
        name,
        isActive,
      });

      res.status(201).json(branch);
    } catch (error) {
      console.error('Create branch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateBranch = [
  body('name').optional().notEmpty(),
  body('isActive').optional().isBoolean(),
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

      const { id } = req.params;
      const branch = await Branch.findOne({ where: { id, companyId } });
      if (!branch) {
        res.status(404).json({ error: 'Branch not found' });
        return;
      }

      const updates: Record<string, unknown> = {};

      if (req.body.name !== undefined) {
        const name = String(req.body.name).trim();
        if (name !== branch.name) {
          const existing = await Branch.findOne({ where: { companyId, name } });
          if (existing && existing.id !== branch.id) {
            res.status(400).json({ error: 'Branch name already exists for this company' });
            return;
          }
        }
        updates.name = name;
      }

      if (req.body.isActive !== undefined) {
        updates.isActive = Boolean(req.body.isActive);
      }

      await branch.update(updates);
      res.json(branch);
    } catch (error) {
      console.error('Update branch error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteBranch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const { id } = req.params;
    const branch = await Branch.findOne({ where: { id, companyId } });
    if (!branch) {
      res.status(404).json({ error: 'Branch not found' });
      return;
    }

    // "Delete" = desactivar para mantener consistencia histórica y no romper referencias.
    await branch.update({ isActive: false });

    res.json({ message: 'Branch deactivated successfully' });
  } catch (error) {
    console.error('Delete branch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

