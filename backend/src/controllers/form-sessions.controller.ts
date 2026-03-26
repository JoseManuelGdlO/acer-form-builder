import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { FormSession, Form, Client } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';

/**
 * Create a new form session (unique link). Called when admin copies the form link.
 * Returns sessionId to use as token in URL: /form/:formId?token=:sessionId
 */
export const createFormSession = async (req: AuthRequest, res: Response): Promise<void> => {
  const formId = req.params.id;
  const userId = req.user?.id;
  const userEmail = req.user?.email;
  const { clientId } = (req.body ?? {}) as { clientId?: string };

  console.log('[form-sessions] createFormSession: inicio', { formId, userId, userEmail });

  try {
    const form = await Form.findByPk(formId);
    if (!form) {
      console.log('[form-sessions] createFormSession: formulario no encontrado', { formId });
      res.status(404).json({ error: 'Form not found' });
      return;
    }
    const companyId = (form as any).companyId;
    if (req.user?.companyId && companyId !== req.user.companyId) {
      res.status(403).json({ error: 'Access denied to this form' });
      return;
    }

    console.log('[form-sessions] createFormSession: formulario encontrado', { formId, formName: form.name });

    let validatedClientId: string | undefined;
    if (clientId) {
      const client = await Client.findOne({
        where: { id: clientId, companyId },
      });
      if (!client) {
        res.status(404).json({ error: 'Client not found for this form company' });
        return;
      }
      validatedClientId = client.id;
    }

    const session = await FormSession.create({
      companyId,
      formId,
      assignedUserId: userId ?? undefined,
      clientId: validatedClientId,
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

    let clientInfo: { id: string; name: string } | null = null;
    if (session.clientId) {
      const client = await Client.findByPk(session.clientId);
      if (client) {
        clientInfo = {
          id: client.id,
          name: client.name,
        };
      }
    }

    res.json({
      progress: session.progress,
      status: session.status,
      clientInfo,
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

/**
 * List form sessions assigned to a client (protected).
 */
export const getClientFormSessions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { clientId } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const sessions = await FormSession.findAll({
      where: { clientId, companyId },
      include: [
        {
          model: Form,
          as: 'form',
          attributes: ['id', 'name', 'description'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json(sessions);
  } catch (error) {
    console.error('Get client form sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
