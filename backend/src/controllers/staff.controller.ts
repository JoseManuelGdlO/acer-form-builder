import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { StaffMember } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const listStaffMembers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const items = await StaffMember.findAll({
      where: { companyId },
      order: [['name', 'ASC']],
    });
    res.json(items);
  } catch (error) {
    console.error('List staff members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStaffMember = [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').optional({ nullable: true }).isString(),
  body('role').optional({ nullable: true }).isString(),
  body('notes').optional({ nullable: true }).isString(),
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
      const item = await StaffMember.create({
        companyId,
        name: String(req.body.name).trim(),
        phone: req.body.phone ? String(req.body.phone).trim() : null,
        role: req.body.role ? String(req.body.role).trim() : null,
        notes: req.body.notes ? String(req.body.notes).trim() : null,
      });
      res.status(201).json(item);
    } catch (error) {
      console.error('Create staff member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateStaffMember = [
  body('name').optional().notEmpty(),
  body('phone').optional({ nullable: true }).isString(),
  body('role').optional({ nullable: true }).isString(),
  body('notes').optional({ nullable: true }).isString(),
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
      const item = await StaffMember.findOne({ where: { id, companyId } });
      if (!item) {
        res.status(404).json({ error: 'Staff member not found' });
        return;
      }
      const updates: Record<string, string | null> = {};
      if (req.body.name !== undefined) updates.name = String(req.body.name).trim();
      if (req.body.phone !== undefined) updates.phone = req.body.phone ? String(req.body.phone).trim() : null;
      if (req.body.role !== undefined) updates.role = req.body.role ? String(req.body.role).trim() : null;
      if (req.body.notes !== undefined) updates.notes = req.body.notes ? String(req.body.notes).trim() : null;
      await item.update(updates);
      res.json(item);
    } catch (error) {
      console.error('Update staff member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteStaffMember = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const item = await StaffMember.findOne({ where: { id, companyId } });
    if (!item) {
      res.status(404).json({ error: 'Staff member not found' });
      return;
    }
    await item.destroy();
    res.json({ message: 'Staff member deleted successfully' });
  } catch (error) {
    console.error('Delete staff member error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
