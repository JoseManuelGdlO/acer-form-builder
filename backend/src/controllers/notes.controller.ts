import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ClientNote, Client } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getClientNotes = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const client = await Client.findOne({ where: { id: clientId, companyId } });
    if (!client) {
      res.status(404).json({ error: 'Client not found' });
      return;
    }
    if (!req.user?.roles.includes('super_admin') && client.assignedUserId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const notes = await ClientNote.findAll({
      where: { clientId },
      order: [['created_at', 'DESC']],
    });

    res.json(notes);
  } catch (error) {
    console.error('Get client notes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createNote = [
  body('content').notEmpty().withMessage('Content is required'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { clientId } = req.params;
      const { content } = req.body;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const client = await Client.findOne({ where: { id: clientId, companyId } });
      if (!client) {
        res.status(404).json({ error: 'Client not found' });
        return;
      }
      if (!req.user?.roles.includes('super_admin') && client.assignedUserId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      const note = await ClientNote.create({
        companyId,
        clientId,
        content,
        createdBy: req.user?.id,
      });

      res.status(201).json(note);
    } catch (error) {
      console.error('Create note error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateNote = [
  body('content').notEmpty().withMessage('Content is required'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const note = await ClientNote.findOne({ where: { id, companyId } });

      if (!note) {
        res.status(404).json({ error: 'Note not found' });
        return;
      }

      const client = await Client.findOne({ where: { id: note.clientId, companyId } });
      if (!req.user?.roles.includes('super_admin') && client && client.assignedUserId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      await note.update({ content: req.body.content });
      res.json(note);
    } catch (error) {
      console.error('Update note error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const note = await ClientNote.findOne({ where: { id, companyId } });

    if (!note) {
      res.status(404).json({ error: 'Note not found' });
      return;
    }

    const client = await Client.findOne({ where: { id: note.clientId, companyId } });
    if (!req.user?.roles.includes('super_admin') && client && client.assignedUserId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await note.destroy();
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
