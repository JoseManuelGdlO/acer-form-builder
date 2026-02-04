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
      const hora = [
        now.getHours().toString().padStart(2, '0'),
        now.getMinutes().toString().padStart(2, '0'),
        now.getSeconds().toString().padStart(2, '0'),
      ].join(':');

      const record = await Conversations.create({
        fkid_clients: phone,
        mensaje,
        from,
        fecha,
        hora: hora as unknown as Date,
        baja_logica: false,
      });

      res.status(201).json(record);
    } catch (error: unknown) {
      console.error('addConv error:', error);
      const err = error as { name?: string; code?: string; original?: { code?: string } };
      const isConnectionError =
        err?.name === 'SequelizeConnectionRefusedError' ||
        err?.code === 'ECONNREFUSED' ||
        err?.original?.code === 'ECONNREFUSED';
      const message =
        process.env.NODE_ENV === 'development' && isConnectionError
          ? 'No se pudo conectar a la base de datos PostgreSQL. Comprueba que esté en ejecución y que PG_HOST, PG_PORT, PG_NAME, PG_USER, PG_PASSWORD en .env sean correctos.'
          : 'Internal server error';
      res.status(500).json({ error: message });
    }
  },
];

export { addConv };