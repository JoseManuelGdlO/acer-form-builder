import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { Conversations } from '../models';

const addConv = [
  body('phone').notEmpty().withMessage('phone is required').trim(),
  body('mensaje').notEmpty().withMessage('mensaje is required').trim(),
  body('from')
    .optional()
    .isIn(['usuario', 'bot'])
    .withMessage('from must be "usuario" or "bot"'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { phone, mensaje, from: fromBody } = req.body;
      const from = fromBody ?? 'usuario';

      const now = new Date();
      const fecha = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const hora = new Date(1970, 0, 1, now.getHours(), now.getMinutes(), now.getSeconds());

      const record = await Conversations.create({
        fkid_clients: phone,
        mensaje,
        from,
        fecha,
        hora,
        baja_logica: false,
      });

      res.status(201).json(record);
    } catch (error) {
      console.error('addConv error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export { addConv };