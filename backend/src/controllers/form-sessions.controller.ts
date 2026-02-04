import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { FormSession, Form } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Create a new form session (unique link). Called when admin copies the form link.
 * Returns sessionId to use as token in URL: /form/:formId?token=:sessionId
 */
export const createFormSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const formId = req.params.id;
  const userId = req.user?.id;
  const userEmail = req.user?.email;

  console.log('[form-sessions] createFormSession: inicio', { formId, userId, userEmail });

  try {
    const form = await Form.findByPk(formId);
    if (!form) {
      console.log('[form-sessions] createFormSession: formulario no encontrado', { formId });
      res.status(404).json({ error: 'Form not found' });
      return;
    }

    console.log('[form-sessions] createFormSession: formulario encontrado', { formId, formName: form.name });

    const session = await FormSession.create({
      formId,
      progress: {},
      status: 'in_progress',
    });

    console.log('[form-sessions] createFormSession: sesión creada OK', {
      formId,
      sessionId: session.id,
      userId,
    });
    res.status(201).json({ sessionId: session.id });
  } catch (error) {
    console.error('[form-sessions] createFormSession: error', { formId, userId, error });
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get session progress (public - no auth). Used when respondent opens the unique link.
 */
export const getFormSessionProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const sessionId = req.params.sessionId;

    const session = await FormSession.findOne({
      where: { id: sessionId, formId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found or invalid' });
      return;
    }

    res.json({
      progress: session.progress,
      status: session.status,
    });
  } catch (error) {
    console.error('Get form session progress error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update session progress (public - no auth). Saves respondent progress to DB.
 */
export const updateFormSessionProgress = [
  body('progress').isObject().withMessage('Progress must be an object'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const formId = req.params.id;
      const sessionId = req.params.sessionId;
      const { progress } = req.body;

      const session = await FormSession.findOne({
        where: { id: sessionId, formId },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found or invalid' });
        return;
      }

      if (session.status === 'completed') {
        res.status(400).json({ error: 'This form has already been submitted' });
        return;
      }

      await session.update({ progress });
      res.json({ progress: session.progress });
    } catch (error) {
      console.error('Update form session progress error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

/**
 * Mark session as completed after successful submission (public).
 */
export const completeFormSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const sessionId = req.params.sessionId;

    const session = await FormSession.findOne({
      where: { id: sessionId, formId },
    });

    if (!session) {
      res.status(404).json({ error: 'Session not found or invalid' });
      return;
    }

    await session.update({ status: 'completed' });
    res.json({ status: 'completed' });
  } catch (error) {
    console.error('Complete form session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
