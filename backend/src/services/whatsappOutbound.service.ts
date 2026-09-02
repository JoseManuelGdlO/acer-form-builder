import sequelize from '../config/database';
import { ClientMessage, Conversations } from '../models';
import { MessageBusinessError } from '../errors/MessageBusinessError';
import {
  findActiveWhatsappIntegrationByCompanyId,
  whatsappIntegrationToGraphContext,
} from './whatsappIntegration.service';
import { sendWhatsappInitialTemplate, sendWhatsappTextMessage } from './whatsappGraph.service';
import { recordConversationMessage } from './conversationsPersistence.service';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export const WHATSAPP_TEMPLATE_WINDOW_NOTICE =
  'Se mandó una plantilla para abrir la conversación. Por favor espera a que el cliente conteste para poder empezar a hablar con él.';

export function normalizePhoneForWhatsapp(phone: string): string {
  const normalized = phone.replace(/\D/g, '');
  return normalized || phone.trim();
}

export type WhatsappOutboundResult = {
  status: 'text_sent' | 'template_sent' | 'failed';
  errorMessage?: string;
};

export async function sendWhatsappOutboundToPhone(
  companyId: string,
  clientPhone: string,
  content: string,
  options?: {
    clientId?: string;
    persistClientMessage?: boolean;
    /** direct: intenta texto libre primero (recordatorios automáticos). respectWindow: igual que el chat del portal. */
    strategy?: 'direct' | 'respectWindow';
  }
): Promise<WhatsappOutboundResult> {
  const phone = clientPhone.trim();
  if (!phone) {
    return { status: 'failed', errorMessage: 'Teléfono vacío' };
  }

  const integration = await findActiveWhatsappIntegrationByCompanyId(companyId);
  if (!integration) {
    return {
      status: 'failed',
      errorMessage: 'No hay integración de WhatsApp activa para esta compañía',
    };
  }

  const graphCtx = whatsappIntegrationToGraphContext(integration);
  const normalizedPhone = normalizePhoneForWhatsapp(phone);
  const strategy = options?.strategy ?? 'respectWindow';

  const persistOutbound = async (mensaje: string, status: 'text_sent' | 'template_sent') => {
    const t = await sequelize.transaction();
    try {
      await recordConversationMessage({
        companyId,
        phone,
        mensaje,
        from: 'bot',
        transaction: t,
      });
      if (options?.persistClientMessage && options.clientId) {
        await ClientMessage.create(
          {
            companyId,
            clientId: options.clientId,
            content: mensaje,
            sender: 'user',
          },
          { transaction: t }
        );
      }
      await t.commit();
    } catch (persistErr) {
      await t.rollback();
      throw persistErr;
    }
    return status;
  };

  if (strategy === 'direct') {
    try {
      await sendWhatsappTextMessage(graphCtx, normalizedPhone, content);
      await persistOutbound(content, 'text_sent');
      return { status: 'text_sent' };
    } catch (textError) {
      const textErrorMessage =
        textError instanceof MessageBusinessError
          ? textError.message
          : textError instanceof Error
            ? textError.message
            : 'No se pudo enviar el texto';
      try {
        await sendWhatsappInitialTemplate(graphCtx, normalizedPhone);
        await persistOutbound(WHATSAPP_TEMPLATE_WINDOW_NOTICE, 'template_sent');
        return {
          status: 'template_sent',
          errorMessage: `Texto no enviado (${textErrorMessage}); se envió plantilla inicial.`,
        };
      } catch (templateError) {
        const templateErrorMessage =
          templateError instanceof MessageBusinessError
            ? templateError.message
            : templateError instanceof Error
              ? templateError.message
              : 'No se pudo enviar la plantilla';
        return {
          status: 'failed',
          errorMessage: `${textErrorMessage}. Plantilla: ${templateErrorMessage}`,
        };
      }
    }
  }

  const lastUserConversation = await Conversations.findOne({
    where: { phone, from: 'usuario', companyId },
    order: [['created_at', 'DESC']],
  });

  const lastUserMessageAt = lastUserConversation ? new Date(lastUserConversation.createdAt) : null;
  const isWindowExpired = lastUserMessageAt
    ? Date.now() - lastUserMessageAt.getTime() >= TWENTY_FOUR_HOURS_MS
    : false;
  const shouldUseTemplateFallback = !lastUserConversation || isWindowExpired;

  try {
    if (shouldUseTemplateFallback) {
      await sendWhatsappInitialTemplate(graphCtx, normalizedPhone);
      await persistOutbound(WHATSAPP_TEMPLATE_WINDOW_NOTICE, 'template_sent');
      return { status: 'template_sent' };
    }

    await sendWhatsappTextMessage(graphCtx, normalizedPhone, content);
    await persistOutbound(content, 'text_sent');
    return { status: 'text_sent' };
  } catch (error) {
    const message =
      error instanceof MessageBusinessError
        ? error.message
        : error instanceof Error
          ? error.message
          : 'Error desconocido al enviar WhatsApp';
    return { status: 'failed', errorMessage: message };
  }
}
