import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ClientMessage, Client, Conversations } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { MessageBusinessError } from '../errors/MessageBusinessError';
import {
  findActiveWhatsappIntegrationByCompanyId,
  whatsappIntegrationToGraphContext,
} from '../services/whatsappIntegration.service';
import { sendWhatsappInitialTemplate, sendWhatsappTextMessage } from '../services/whatsappGraph.service';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/** Mensaje guardado cuando solo se envía plantilla (ventana de 24h cerrada); el texto libre del agente no se envía ni se persiste. */
const WHATSAPP_TEMPLATE_WINDOW_NOTICE =
  'Se mandó una plantilla para abrir la conversación. Por favor espera a que el cliente conteste para poder empezar a hablar con él.';

const normalizePhoneForWhatsapp = (phone: string): string => {
  const normalized = phone.replace(/\D/g, '');
  return normalized || phone.trim();
};

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
}: {
  companyId: string;
  clientId: string;
  content: string;
  sender: 'user' | 'client';
  senderId?: string;
}) => {
  return ClientMessage.create({
    companyId,
    clientId,
    content,
    sender,
    senderId: sender === 'user' ? senderId : undefined,
  });
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
        await Conversations.create({
          companyId,
          phone: clientPhone,
          mensaje: WHATSAPP_TEMPLATE_WINDOW_NOTICE,
          from: 'bot',
          fecha,
          hora: hora as unknown as Date,
          baja_logica: false,
        });
        const message = await createInternalMessage({
          companyId,
          clientId,
          content: WHATSAPP_TEMPLATE_WINDOW_NOTICE,
          sender,
          senderId: req.user?.id,
        });
        res.status(201).json({
          ...message.get({ plain: true }),
          onlyTemplateSent: true,
        });
        return;
      }

      await sendWhatsappTextMessage(graphCtx, normalizedPhone, content);

      await Conversations.create({
        companyId,
        phone: clientPhone,
        mensaje: content,
        from: 'bot',
        fecha,
        hora: hora as unknown as Date,
        baja_logica: false,
      });

      const message = await createInternalMessage({
        companyId,
        clientId,
        content,
        sender,
        senderId: req.user?.id,
      });

      res.status(201).json(message);
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
