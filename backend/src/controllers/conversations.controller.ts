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


const ALLOWED_UPDATE_FIELDS = [
  'fkid_clients',
  'mensaje',
  'from',
  'baja_logica'
] as const;

const updateConv = [
  body('fkid_clients')
    .optional()
    .isString()
    .withMessage('fkid_clients must be a string')
    .trim(),
  body('mensaje')
    .optional()
    .isString()
    .withMessage('mensaje must be a string'),
  body('from')
    .optional()
    .isIn(['usuario', 'bot'])
    .withMessage('from must be "usuario" or "bot"'),
  body('baja_logica')
    .optional()
    .isBoolean()
    .withMessage('baja_logica must be true or false'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const identifier = (req.params.id ?? '').trim();
      if (!identifier) {
        res.status(400).json({ error: 'Identifier (id or phone) is required' });
        return;
      }

      const updateData: Record<string, unknown> = {};
      for (const key of ALLOWED_UPDATE_FIELDS) {
        if (req.body[key] !== undefined) {
          updateData[key] = req.body[key];
        }
      }

      if (Object.keys(updateData).length === 0) {
        res.status(400).json({ error: 'At least one field to update is required' });
        return;
      }

      const isId = /^\d+$/.test(identifier);

      if (isId) {
        const id = parseInt(identifier, 10);
        const record = await Conversations.findByPk(id);
        if (!record) {
          res.status(404).json({ error: 'Conversation not found' });
          return;
        }
        await record.update(updateData);
        res.json(record);
      } else {
        const [count] = await Conversations.update(updateData, {
          where: { fkid_clients: identifier },
        });
        res.json({ updated: count, phone: identifier, ...updateData });
      }
    } catch (error: unknown) {
      console.error('updateConv error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

const bajaLogicaConv = [
  body('baja_logica')
    .isBoolean()
    .withMessage('baja_logica must be true or false'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { baja_logica } = req.body;
      const record = await Conversations.findOne({
        where: { fkid_clients: req.params.phone },
        order: [['id', 'DESC']],
      });
      if (!record) {
        res.status(404).json({ error: 'Conversation not found' });
        return;
      }
      await record.update({ baja_logica });
      res.json(record);
    } catch (error: unknown) {
      console.error('bajaLogicaConv error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export { addConv, bajaLogicaConv, updateConv };