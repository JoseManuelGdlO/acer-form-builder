import { MessageBusinessError } from '../errors/MessageBusinessError';

export type WhatsAppGraphContext = {
  accessToken: string;
  phoneNumberId: string;
  graphApiVersion: string;
  templateLanguage: string;
  initialTemplateName: string;
};

export async function sendWhatsappTextMessage(
  ctx: WhatsAppGraphContext,
  to: string,
  bodyText: string
): Promise<void> {
  const { accessToken, phoneNumberId, graphApiVersion } = ctx;
  if (!phoneNumberId || !accessToken) {
    throw new MessageBusinessError(
      500,
      'WHATSAPP_CONFIG_MISSING',
      'No se pudo enviar el mensaje de WhatsApp por configuración faltante.'
    );
  }

  const version = graphApiVersion || 'v22.0';
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

  const data = (await response.json().catch(() => null)) as
    | { error?: { message?: string }; messages?: { id?: string }[] }
    | null;

  if (!response.ok) {
    const metaMessage = data?.error?.message;
    throw new MessageBusinessError(
      502,
      'WHATSAPP_SEND_FAILED',
      metaMessage || 'No se pudo enviar el mensaje de WhatsApp.'
    );
  }

  if (data?.error?.message) {
    throw new MessageBusinessError(502, 'WHATSAPP_SEND_FAILED', data.error.message);
  }
  if (!Array.isArray(data?.messages) || !data.messages[0]?.id) {
    throw new MessageBusinessError(
      502,
      'WHATSAPP_SEND_FAILED',
      'WhatsApp no confirmó el envío del mensaje.'
    );
  }
}

export async function sendWhatsappInitialTemplate(ctx: WhatsAppGraphContext, to: string): Promise<void> {
  const { accessToken, phoneNumberId, graphApiVersion, templateLanguage, initialTemplateName } = ctx;
  if (!phoneNumberId || !accessToken) {
    throw new MessageBusinessError(
      500,
      'WHATSAPP_CONFIG_MISSING',
      'No se pudo enviar la plantilla de WhatsApp por configuración faltante.'
    );
  }

  const version = graphApiVersion || 'v22.0';
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
        name: initialTemplateName || 'mensaje_inicial',
        language: {
          code: templateLanguage || 'es_MX',
        },
      },
    }),
  });

  const data = (await response.json().catch(() => null)) as
    | { error?: { message?: string }; messages?: { id?: string }[] }
    | null;

  if (!response.ok) {
    const metaMessage = data?.error?.message;
    throw new MessageBusinessError(
      502,
      'WHATSAPP_TEMPLATE_SEND_FAILED',
      metaMessage || 'No se pudo enviar la plantilla de WhatsApp.'
    );
  }

  if (data?.error?.message) {
    throw new MessageBusinessError(502, 'WHATSAPP_TEMPLATE_SEND_FAILED', data.error.message);
  }
  if (!Array.isArray(data?.messages) || !data.messages[0]?.id) {
    throw new MessageBusinessError(
      502,
      'WHATSAPP_TEMPLATE_SEND_FAILED',
      'WhatsApp no confirmó el envío de la plantilla.'
    );
  }
}
