import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { BotBehavior } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

export const getBotBehavior = async (req: Request, res: Response): Promise<void> => {
  try {
    // Bot behavior is a singleton - get the first (and only) record
    let bot = await BotBehavior.findOne();

    // If it doesn't exist, create default
    if (!bot) {
      bot = await BotBehavior.create({
        name: 'Asistente Saru',
        greeting: '¡Hola! Soy el asistente virtual de Saru Visas. ¿En qué puedo ayudarte hoy?',
        personality: 'Soy un asistente amable y profesional especializado en trámites de visa y pasaporte. Mi objetivo es ayudar a resolver dudas de manera clara y eficiente.',
        tone: 'professional',
        fallbackMessage: 'Lo siento, no tengo información sobre esa consulta. Por favor, contacta a nuestro equipo de soporte para más ayuda.',
        responseDelay: 500,
        isActive: true,
      });
    }

    res.json(bot);
  } catch (error) {
    console.error('Get bot behavior error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBotBehavior = [
  body('name').optional().notEmpty(),
  body('greeting').optional().notEmpty(),
  body('personality').optional().notEmpty(),
  body('tone').optional().isIn(['formal', 'friendly', 'professional']),
  body('fallbackMessage').optional().notEmpty(),
  body('responseDelay').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      let bot = await BotBehavior.findOne();

      if (!bot) {
        // Create if doesn't exist
        bot = await BotBehavior.create({
          name: 'Asistente Saru',
          greeting: '¡Hola! Soy el asistente virtual de Saru Visas. ¿En qué puedo ayudarte hoy?',
          personality: 'Soy un asistente amable y profesional especializado en trámites de visa y pasaporte.',
          tone: 'professional',
          fallbackMessage: 'Lo siento, no tengo información sobre esa consulta.',
          responseDelay: 500,
          isActive: true,
        });
      }

      await bot.update(req.body);
      res.json(bot);
    } catch (error) {
      console.error('Update bot behavior error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];
