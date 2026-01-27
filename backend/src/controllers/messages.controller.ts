import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ClientMessage, Client } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getClientMessages = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;

    // Check if reviewer can access this client
    if (req.user && !req.user.roles.includes('super_admin')) {
      const client = await Client.findByPk(clientId);
      if (!client || client.assignedUserId !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    const messages = await ClientMessage.findAll({
      where: { clientId },
      order: [['created_at', 'ASC']],
    });

    res.json(messages);
  } catch (error) {
    console.error('Get client messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createMessage = [
  body('content').notEmpty().withMessage('Content is required'),
  body('sender').isIn(['user', 'client']).withMessage('Invalid sender'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { clientId } = req.params;
      const { content, sender } = req.body;

      // Check if reviewer can access this client
      if (req.user && !req.user.roles.includes('super_admin')) {
        const client = await Client.findByPk(clientId);
        if (!client || client.assignedUserId !== req.user.id) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }

      const message = await ClientMessage.create({
        clientId,
        content,
        sender,
        senderId: sender === 'user' ? req.user?.id : undefined,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Create message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const message = await ClientMessage.findByPk(id);

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    // Check if reviewer can access this client
    if (req.user && !req.user.roles.includes('super_admin')) {
      const client = await Client.findByPk(message.clientId);
      if (!client || client.assignedUserId !== req.user.id) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
