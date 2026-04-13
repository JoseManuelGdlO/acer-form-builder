import { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BotBehavior } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

/** Respuesta estable con camelCase; los tres campos de contacto siempre van en el JSON. */
export function serializeBotBehavior(bot: BotBehavior) {
  const p = bot.get({ plain: true }) as unknown as Record<string, unknown>;
  return {
    id: p.id,
    companyId: p.companyId ?? p.company_id,
    name: p.name,
    greeting: p.greeting,
    personality: p.personality,
    tone: p.tone,
    fallbackMessage: p.fallbackMessage ?? p.fallback_message,
    responseDelay: p.responseDelay ?? p.response_delay,
    isActive: p.isActive ?? p.is_active,
    branchesText: (p.branchesText ?? p.branches_text ?? null) as string | null,
    socialLinks: (p.socialLinks ?? p.social_links ?? null) as string | null,
    contactPhone: (p.contactPhone ?? p.contact_phone ?? null) as string | null,
    createdAt: p.createdAt ?? p.created_at,
    updatedAt: p.updatedAt ?? p.updated_at,
  };
}

export const getBotBehavior = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    let bot = await BotBehavior.findOne({ where: { companyId } });

    if (!bot) {
      bot = await BotBehavior.create({
        companyId,
        name: 'Asistente Saru',
        greeting: '¡Hola! Soy el asistente virtual de Saru Visas. ¿En qué puedo ayudarte hoy?',
        personality: 'Soy un asistente amable y profesional especializado en trámites de visa y pasaporte. Mi objetivo es ayudar a resolver dudas de manera clara y eficiente.',
        tone: 'professional',
        fallbackMessage: 'Lo siento, no tengo información sobre esa consulta. Por favor, contacta a nuestro equipo de soporte para más ayuda.',
        responseDelay: 500,
        isActive: true,
        branchesText: null,
        socialLinks: null,
        contactPhone: null,
      });
    }

    res.json(serializeBotBehavior(bot));
  } catch (error) {
    console.error('Get bot behavior error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBotBehavior = [
  body('name').optional().notEmpty(),
  body('greeting').optional().notEmpty(),
  body('personality').optional().isString().isLength({ max: 20000 }),
  body('tone').optional().isIn(['formal', 'friendly', 'professional']),
  body('fallbackMessage').optional().notEmpty(),
  body('responseDelay').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  body('branchesText').optional().isString().isLength({ max: 65535 }),
  body('socialLinks').optional().isString().isLength({ max: 65535 }),
  body('contactPhone').optional().isString().isLength({ max: 64 }),
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
      let bot = await BotBehavior.findOne({ where: { companyId } });

      if (!bot) {
        bot = await BotBehavior.create({
          companyId,
          name: 'Asistente Saru',
          greeting: '¡Hola! Soy el asistente virtual de Saru Visas. ¿En qué puedo ayudarte hoy?',
          personality: 'Soy un asistente amable y profesional especializado en trámites de visa y pasaporte.',
          tone: 'professional',
          fallbackMessage: 'Lo siento, no tengo información sobre esa consulta.',
          responseDelay: 500,
          isActive: true,
          branchesText: null,
          socialLinks: null,
          contactPhone: null,
        });
      }

      await bot.update(req.body);
      await bot.reload();
      res.json(serializeBotBehavior(bot));
    } catch (error) {
      console.error('Update bot behavior error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];
