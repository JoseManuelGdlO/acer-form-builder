import type { Transaction } from 'sequelize';
import { Conversations } from '../models';

export type ConversationFromRole = 'usuario' | 'bot';

export function getConversationDatePartsForRecord(): { fecha: Date; hora: string } {
  const now = new Date();
  const fecha = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const hora = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join(':');

  return { fecha, hora };
}

export async function recordConversationMessage(
  {
    companyId,
    phone,
    mensaje,
    from,
    transaction,
  }: {
    companyId: string;
    phone: string;
    mensaje: string;
    from: ConversationFromRole;
    transaction?: Transaction;
  }
): Promise<Conversations> {
  const { fecha, hora } = getConversationDatePartsForRecord();
  return Conversations.create(
    {
      companyId,
      phone,
      mensaje,
      from,
      fecha,
      hora: hora as unknown as Date,
      baja_logica: false,
    },
    transaction ? { transaction } : undefined
  );
}
