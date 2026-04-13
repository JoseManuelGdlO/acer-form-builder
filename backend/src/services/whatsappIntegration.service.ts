import { WhatsappIntegration } from '../models';
import type { WhatsAppGraphContext } from './whatsappGraph.service';

export async function findActiveWhatsappIntegrationByCompanyId(
  companyId: string
): Promise<WhatsappIntegration | null> {
  return WhatsappIntegration.findOne({
    where: { companyId, isActive: true },
  });
}

export function whatsappIntegrationToGraphContext(row: WhatsappIntegration): WhatsAppGraphContext {
  return {
    accessToken: row.accessToken,
    phoneNumberId: row.phoneNumberId,
    graphApiVersion: row.graphApiVersion || 'v22.0',
    templateLanguage: row.templateLanguage || 'es_MX',
    initialTemplateName: row.initialTemplateName || 'mensaje_inicial',
  };
}
