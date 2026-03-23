import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { ClientMessage, Client, Conversations } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

class MessageBusinessError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

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

const sendTextMessage = async (to: string, bodyText: string): Promise<void> => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_VERSION || 'v22.0';

  if (!phoneNumberId || !accessToken) {
    throw new MessageBusinessError(
      500,
      'WHATSAPP_CONFIG_MISSING',
      'No se pudo enviar el mensaje de WhatsApp por configuración faltante.'
    );
  }

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        preview_url: false,
        body: bodyText,
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    const metaMessage = errorPayload?.error?.message;
    throw new MessageBusinessError(
      502,
      'WHATSAPP_SEND_FAILED',
      metaMessage || 'No se pudo enviar el mensaje de WhatsApp.'
    );
  }
};

const sendTemplateMessage = async (to: string): Promise<void> => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const version = process.env.WHATSAPP_VERSION || 'v22.0';

  if (!phoneNumberId || !accessToken) {
    throw new MessageBusinessError(
      500,
      'WHATSAPP_CONFIG_MISSING',
      'No se pudo enviar la plantilla de WhatsApp por configuración faltante.'
    );
  }

  const response = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: 'mensaje_inicial',
        language: {
          code: 'es_MX',
        },
      },
    }),
  });

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: { message?: string } }
      | null;
    const metaMessage = errorPayload?.error?.message;
    throw new MessageBusinessError(
      502,
      'WHATSAPP_TEMPLATE_SEND_FAILED',
      metaMessage || 'No se pudo enviar la plantilla de WhatsApp.'
    );
  }
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
        where: { phone: clientPhone, from: 'usuario' },
        order: [['created_at', 'DESC']],
      });

      const lastUserMessageAt = lastUserConversation ? new Date(lastUserConversation.createdAt) : null;
      const isWindowExpired = lastUserMessageAt
        ? Date.now() - lastUserMessageAt.getTime() >= TWENTY_FOUR_HOURS_MS
        : false;
      const { fecha, hora } = getConversationDateParts();
      const normalizedPhone = normalizePhoneForWhatsapp(clientPhone);
      const shouldUseTemplateFallback = !lastUserConversation || isWindowExpired;

      if (shouldUseTemplateFallback) {
        await sendTemplateMessage(normalizedPhone);
        await Conversations.create({
          phone: clientPhone,
          mensaje: '[Plantilla mensaje_inicial enviada]',
          from: 'bot',
          fecha,
          hora: hora as unknown as Date,
          baja_logica: false,
        });
      }

      await sendTextMessage(normalizedPhone, content);

      await Conversations.create({
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
