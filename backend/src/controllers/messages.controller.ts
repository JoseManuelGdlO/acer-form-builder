import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import type { Transaction } from 'sequelize';
import sequelize from '../config/database';
import { ClientMessage, Client, Conversations } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { MessageBusinessError } from '../errors/MessageBusinessError';
import {
  findActiveWhatsappIntegrationByCompanyId,
  whatsappIntegrationToGraphContext,
} from '../services/whatsappIntegration.service';
import { sendWhatsappInitialTemplate, sendWhatsappTextMessage } from '../services/whatsappGraph.service';
import { recordConversationMessage } from '../services/conversationsPersistence.service';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Mensaje guardado cuando solo se envía plantilla (ventana de 24h cerrada); el texto libre del agente no se envía ni se persiste. */
const WHATSAPP_TEMPLATE_WINDOW_NOTICE =
  'Se mandó una plantilla para abrir la conversación. Por favor espera a que el cliente conteste para poder empezar a hablar con él.';

const normalizePhoneForWhatsapp = (phone: string): string => {
  const normalized = phone.replace(/\D/g, '');
  return normalized || phone.trim();
};

const normalizePhoneDigits = (phone: string): string => phone.replace(/\D/g, '');

const getConversationDateParts = (): { fecha: Date; hora: string } => {
  const now = new Date();
  const fecha = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hora = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join(':');

  return { fecha, hora };
};

const createInternalMessage = async ({
  companyId,
  clientId,
  content,
  sender,
  senderId,
  transaction,
}: {
  companyId: string;
  clientId: string;
  content: string;
  sender: 'user' | 'client';
  senderId?: string;
  transaction?: Transaction;
}) => {
  return ClientMessage.create(
    {
      companyId,
      clientId,
      content,
      sender,
      senderId: sender === 'user' ? senderId : undefined,
    },
    transaction ? { transaction } : undefined
  );
};

export const getClientMessages = async (req: AuthRequest, res: Response): Promise<void> => {
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

const findPrimaryClientsMatchingPhoneDigits = async (
  companyId: string,
  phoneDigits: string
): Promise<Client[]> => {
  if (!phoneDigits) return [];
  const candidateClients = await Client.findAll({
    where: {
      parentClientId: null,
      companyId,
    },
    attributes: ['id', 'name', 'phone', 'companyId'],
  });
  return candidateClients.filter((client) => {
    const clientPhone = typeof client.phone === 'string' ? client.phone : '';
    if (!clientPhone) return false;
    return normalizePhoneDigits(clientPhone) === phoneDigits;
  });
};

/** n8n: envía texto WhatsApp (sin ventana 24h) y persiste como addChat (`from: bot`). Opcional ClientMessage si hay un solo titular con ese teléfono. */
export const sendAndAddToChat = [
  body('phone').isString().notEmpty().withMessage('phone is required'),
  body('mensaje').isString().notEmpty().withMessage('mensaje is required'),
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

      const phone = req.body.phone as string;
      const mensaje = req.body.mensaje as string;

      const phoneDigits = normalizePhoneDigits(phone);
      const matchedClients = await findPrimaryClientsMatchingPhoneDigits(companyId, phoneDigits);
      if (matchedClients.length > 1) {
        res.status(409).json({
          error: 'Varios clientes titulares comparten este teléfono; usa POST /api/messages/clients/:clientId con el cliente concreto.',
          code: 'MULTIPLE_CLIENTS_MATCH_PHONE',
        });
        return;
      }

      const integration = await findActiveWhatsappIntegrationByCompanyId(companyId);
      if (!integration) {
        throw new MessageBusinessError(
          422,
          'WHATSAPP_INTEGRATION_NOT_CONFIGURED',
          'No hay integración de WhatsApp activa para esta compañía. Solicita a un administrador que inserte los datos en la base de datos (tabla whatsapp_integrations).'
        );
      }
      const graphCtx = whatsappIntegrationToGraphContext(integration);
      const normalizedPhone = normalizePhoneForWhatsapp(phone);

      await sendWhatsappTextMessage(graphCtx, normalizedPhone, mensaje);

      const singleClient = matchedClients.length === 1 ? matchedClients[0] : null;

      if (singleClient) {
        const t = await sequelize.transaction();
        try {
          const record = await recordConversationMessage({
            companyId,
            phone,
            mensaje,
            from: 'bot',
            transaction: t,
          });
          const clientMessage = await createInternalMessage({
            companyId,
            clientId: singleClient.id,
            content: mensaje,
            sender: 'user',
            senderId: req.user?.id,
            transaction: t,
          });
          await t.commit();
          res.status(201).json({
            ...record.get({ plain: true }),
            clientMessage: clientMessage.get({ plain: true }),
          });
        } catch (persistErr) {
          await t.rollback();
          throw persistErr;
        }
      } else {
        const record = await recordConversationMessage({
          companyId,
          phone,
          mensaje,
          from: 'bot',
        });
        res.status(201).json(record.get({ plain: true }));
      }
    } catch (error) {
      if (error instanceof MessageBusinessError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }
      console.error('sendAndAddToChat error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

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

      if (sender !== 'user') {
        const message = await createInternalMessage({
          companyId,
          clientId,
          content,
          sender,
          senderId: req.user?.id,
        });
        res.status(201).json(message);
        return;
      }

      const clientPhone = (client.phone || '').trim();
      if (!clientPhone) {
        const message = await createInternalMessage({
          companyId,
          clientId,
          content,
          sender,
          senderId: req.user?.id,
        });
        res.status(422).json({
          error: 'El cliente no tiene teléfono registrado para enviar WhatsApp.',
          code: 'CLIENT_PHONE_REQUIRED',
          message,
        });
        return;
      }

      const lastUserConversation = await Conversations.findOne({
        where: { phone: clientPhone, from: 'usuario', companyId },
        order: [['created_at', 'DESC']],
      });

      const lastUserMessageAt = lastUserConversation ? new Date(lastUserConversation.createdAt) : null;
      const isWindowExpired = lastUserMessageAt
        ? Date.now() - lastUserMessageAt.getTime() >= TWENTY_FOUR_HOURS_MS
        : false;
      const { fecha, hora } = getConversationDateParts();
      const normalizedPhone = normalizePhoneForWhatsapp(clientPhone);
      const shouldUseTemplateFallback = !lastUserConversation || isWindowExpired;

      const integration = await findActiveWhatsappIntegrationByCompanyId(companyId);
      if (!integration) {
        throw new MessageBusinessError(
          422,
          'WHATSAPP_INTEGRATION_NOT_CONFIGURED',
          'No hay integración de WhatsApp activa para esta compañía. Solicita a un administrador que inserte los datos en la base de datos (tabla whatsapp_integrations).'
        );
      }
      const graphCtx = whatsappIntegrationToGraphContext(integration);

      if (shouldUseTemplateFallback) {
        await sendWhatsappInitialTemplate(graphCtx, normalizedPhone);
        const t = await sequelize.transaction();
        try {
          await Conversations.create(
            {
              companyId,
              phone: clientPhone,
              mensaje: WHATSAPP_TEMPLATE_WINDOW_NOTICE,
              from: 'bot',
              fecha,
              hora: hora as unknown as Date,
              baja_logica: false,
            },
            { transaction: t }
          );
          const message = await createInternalMessage({
            companyId,
            clientId,
            content: WHATSAPP_TEMPLATE_WINDOW_NOTICE,
            sender,
            senderId: req.user?.id,
            transaction: t,
          });
          await t.commit();
          res.status(201).json({
            ...message.get({ plain: true }),
            onlyTemplateSent: true,
          });
        } catch (persistErr) {
          await t.rollback();
          throw persistErr;
        }
        return;
      }

      await sendWhatsappTextMessage(graphCtx, normalizedPhone, content);

      const t = await sequelize.transaction();
      try {
        await Conversations.create(
          {
            companyId,
            phone: clientPhone,
            mensaje: content,
            from: 'bot',
            fecha,
            hora: hora as unknown as Date,
            baja_logica: false,
          },
          { transaction: t }
        );
        const message = await createInternalMessage({
          companyId,
          clientId,
          content,
          sender,
          senderId: req.user?.id,
          transaction: t,
        });
        await t.commit();
        res.status(201).json(message);
      } catch (persistErr) {
        await t.rollback();
        throw persistErr;
      }
    } catch (error) {
      if (error instanceof MessageBusinessError) {
        res.status(error.status).json({
          error: error.message,
          code: error.code,
          details: error.details,
        });
        return;
      }
      console.error('Create message error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteMessage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const message = await ClientMessage.findOne({ where: { id, companyId } });

    if (!message) {
      res.status(404).json({ error: 'Message not found' });
      return;
    }

    const client = await Client.findOne({ where: { id: message.clientId, companyId } });
    if (!req.user?.roles.includes('super_admin') && client && client.assignedUserId !== req.user?.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await message.destroy();
    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
