import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { FormSubmission, Form, Client, FormSession, VisaStatusTemplate } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';

const getDefaultVisaStatusTemplateId = async (companyId: string): Promise<string | null> => {
  const templates = await VisaStatusTemplate.findAll({
    where: { companyId, isActive: true },
    order: [['order', 'ASC']],
  });
  if (templates.length === 0) return null;
  const inProgress = templates.find((t) => t.label.toLowerCase().includes('proceso'));
  return (inProgress || templates[0]).id;
};

const normalizePhoneDigits = (phone: unknown): string | undefined => {
  if (typeof phone !== 'string') return undefined;
  const normalized = phone.replace(/\D/g, '').slice(0, 10);
  return normalized || undefined;
};

export const getAllSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const { formId, clientId, status } = req.query;
    const where: any = { companyId };

    if (formId) where.formId = formId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    // If user is reviewer, only show submissions of assigned clients
    if (req.user && !req.user.roles.includes('super_admin')) {
      const assignedClients = await Client.findAll({
        where: { companyId, assignedUserId: req.user.id },
        attributes: ['id'],
      });
      const clientIds = assignedClients.map((c) => c.id);
      where.clientId = { [Op.in]: clientIds };
    }

    const submissions = await FormSubmission.findAll({
      where,
      include: [
        {
          model: Form,
          as: 'form',
          // Include all form fields, especially sections with questions
          // Don't limit attributes so we get sections
        },
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['submitted_at', 'DESC']],
    });

    res.json(submissions);
  } catch (error) {
    console.error('Get all submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissionById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const submission = await FormSubmission.findOne({
      where: { id, companyId },
      include: [
        { model: Form, as: 'form' },
        { model: Client, as: 'client' },
      ],
    });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // Check if reviewer can access this submission
    if (req.user && !req.user.roles.includes('super_admin')) {
      if (submission.clientId) {
        const client = await Client.findByPk(submission.clientId);
        if (client && client.assignedUserId !== req.user.id) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }
    }

    res.json(submission);
  } catch (error) {
    console.error('Get submission by id error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createSubmission = [
  body('formId').notEmpty().withMessage('Form ID is required'),
  body('formName').notEmpty().withMessage('Form name is required'),
  body('respondentName').notEmpty().withMessage('Respondent name is required'),
  body('respondentEmail').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  body('answers').isObject().withMessage('Answers must be an object'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      let { formId, formName, respondentName, respondentEmail, respondentPhone, address, answers, clientId } = req.body;

      const form = await Form.findOne({ where: { id: formId, companyId } });
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      // Email is optional - don't use placeholder
      if (respondentEmail && typeof respondentEmail === 'string') {
        respondentEmail = respondentEmail.trim() || null;
      } else {
        respondentEmail = null;
      }

      // Debug: Log received data
      console.log('Received submission data:', {
        formId,
        formName,
        respondentName,
        respondentEmail,
        answers,
        answersType: typeof answers,
        answersIsArray: Array.isArray(answers),
        answersKeys: answers && typeof answers === 'object' && !Array.isArray(answers) ? Object.keys(answers) : [],
        answersLength: answers && typeof answers === 'object' && !Array.isArray(answers) ? Object.keys(answers).length : 0,
        rawBody: JSON.stringify(req.body),
      });

      // Validate answers is an object (not array, not null, not undefined)
      if (!answers) {
        console.warn('Answers is null or undefined, using empty object');
      } else if (typeof answers !== 'object' || Array.isArray(answers)) {
        console.error('Invalid answers format:', answers, 'Type:', typeof answers);
        res.status(400).json({ error: 'Answers must be a valid object' });
        return;
      }

      // Ensure answers is always an object
      const finalAnswers = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};
      
      // Normalize answers format - support both old format (questionId: answer) 
      // and new format (questionId: { question, answer, ... })
      const normalizedAnswers: Record<string, any> = {};
      Object.entries(finalAnswers).forEach(([questionId, answerData]) => {
        // If answerData is already an object with question info, keep it
        if (answerData && typeof answerData === 'object' && !Array.isArray(answerData) && 'question' in answerData) {
          normalizedAnswers[questionId] = answerData;
        } else {
          // Old format: just the answer value, convert to new format
          normalizedAnswers[questionId] = {
            questionId,
            answer: answerData,
          };
        }
      });
      
      console.log('Final answers to save:', normalizedAnswers);
      console.log('Final answers keys:', Object.keys(normalizedAnswers));

      // Try to find or create client by email
      let finalClientId = clientId;
      if (!finalClientId && respondentEmail) {
        const defaultVisaStatusTemplateId = await getDefaultVisaStatusTemplateId(companyId);
        if (!defaultVisaStatusTemplateId) {
          res.status(400).json({ error: 'No visa status templates configured' });
          return;
        }
        let client = await Client.findOne({ where: { email: respondentEmail, companyId } });
        if (!client) {
          client = await Client.create({
            companyId,
            name: respondentName,
            email: respondentEmail,
            phone: respondentPhone || undefined,
            address: address || undefined,
            status: 'pending',
            visaStatusTemplateId: defaultVisaStatusTemplateId,
          });
        } else {
          // Update existing client with new information
          const updateData: any = {};
          if (respondentPhone !== undefined && respondentPhone !== null && respondentPhone !== '') {
            updateData.phone = respondentPhone;
          }
          if (address !== undefined && address !== null && address !== '') {
            updateData.address = address;
          }
          if (Object.keys(updateData).length > 0) {
            await client.update(updateData);
          }
        }
        finalClientId = client.id;
      }

      const submission = await FormSubmission.create({
        companyId,
        formId,
        formName,
        respondentName,
        respondentEmail,
        respondentPhone: respondentPhone || undefined,
        answers: normalizedAnswers,
        clientId: finalClientId,
        status: 'pending',
      });

      console.log('Created submission:', {
        id: submission.id,
        answers: submission.answers,
        answersType: typeof submission.answers,
        answersKeys: submission.answers ? Object.keys(submission.answers) : [],
        answersStringified: JSON.stringify(submission.answers),
      });

      // Update client's formsCompleted count (cuestionarios contestados = submitted, not cancelled)
      if (finalClientId) {
        const client = await Client.findByPk(finalClientId);
        if (client) {
          const count = await FormSubmission.count({
            where: {
              clientId: finalClientId,
              status: { [Op.in]: ['pending', 'in_progress', 'completed'] },
            },
          });
          await client.update({ formsCompleted: count });
          console.log(`Updated client ${finalClientId} formsCompleted to ${count} (after creating submission ${submission.id})`);
        }
      }

      res.status(201).json(submission);
    } catch (error) {
      console.error('Create submission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const updateSubmission = [
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  body('answers').optional().isObject(),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;
      const companyId = req.user?.companyId;
      if (!companyId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const submission = await FormSubmission.findOne({ where: { id, companyId } });

      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      // Check if reviewer can update this submission
      if (req.user && !req.user.roles.includes('super_admin')) {
        if (submission.clientId) {
          const client = await Client.findByPk(submission.clientId);
          if (client && client.assignedUserId !== req.user.id) {
            res.status(403).json({ error: 'Access denied' });
            return;
          }
        }
      }

      await submission.update(req.body);
      
      // Reload submission to get updated clientId if it changed
      await submission.reload();

      // Update client's formsCompleted count (cuestionarios contestados)
      if (submission.clientId) {
        const client = await Client.findByPk(submission.clientId);
        if (client) {
          const count = await FormSubmission.count({
            where: {
              clientId: submission.clientId,
              status: { [Op.in]: ['pending', 'in_progress', 'completed'] },
            },
          });
          await client.update({ formsCompleted: count });
          console.log(`Updated client ${submission.clientId} formsCompleted to ${count}`);
        }
      }

      res.json(submission);
    } catch (error) {
      console.error('Update submission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

export const deleteSubmission = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const submission = await FormSubmission.findOne({ where: { id, companyId } });

    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    // Check if reviewer can delete this submission
    if (req.user && !req.user.roles.includes('super_admin')) {
      if (submission.clientId) {
        const client = await Client.findByPk(submission.clientId);
        if (client && client.assignedUserId !== req.user.id) {
          res.status(403).json({ error: 'Access denied' });
          return;
        }
      }
    }

    await submission.destroy();
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getSubmissionStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    const where: any = { companyId };

    // If user is reviewer, only count submissions of assigned clients
    if (req.user && !req.user.roles.includes('super_admin')) {
      const assignedClients = await Client.findAll({
        where: { companyId, assignedUserId: req.user.id },
        attributes: ['id'],
      });
      const clientIds = assignedClients.map((c) => c.id);
      where.clientId = { [Op.in]: clientIds };
    }

    const total = await FormSubmission.count({ where });
    const pending = await FormSubmission.count({ where: { ...where, status: 'pending' } });
    const inProgress = await FormSubmission.count({ where: { ...where, status: 'in_progress' } });
    const completed = await FormSubmission.count({ where: { ...where, status: 'completed' } });
    const cancelled = await FormSubmission.count({ where: { ...where, status: 'cancelled' } });

    res.json({
      total,
      pending,
      in_progress: inProgress,
      completed,
      cancelled,
    });
  } catch (error) {
    console.error('Get submission stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new submission from a form session (public endpoint)
 * Called after user completes the 'info' step
 */
export const createSubmissionFromSession = [
  body('clientInfo.name').notEmpty().withMessage('Client name is required'),
  body('clientInfo.phone').notEmpty().withMessage('Client phone is required'),
  body('clientInfo.email').optional({ checkFalsy: true }).isEmail().normalizeEmail(),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const formId = req.params.id;
      const { sessionId } = req.params;
      const { clientInfo } = req.body;

      // Validate session exists and is in progress
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

      // Check if submission already exists for this session
      if (session.submissionId) {
        const existingSubmission = await FormSubmission.findByPk(session.submissionId);
        if (existingSubmission) {
          res.json(existingSubmission);
          return;
        }
      }

      // Get form data
      const form = await Form.findByPk(formId);
      if (!form) {
        res.status(404).json({ error: 'Form not found' });
        return;
      }

      // Email is optional - don't use placeholder
      let email = clientInfo.email;
      if (email && typeof email === 'string') {
        email = email.trim() || null;
      } else {
        email = null;
      }

      // Find or create client
      let client;
      let clientId;
      
      const companyId = (form as any).companyId;
      const assignedUserId = (session as any).assignedUserId ?? undefined;
      const defaultVisaStatusTemplateId = await getDefaultVisaStatusTemplateId(companyId);
      if (!defaultVisaStatusTemplateId) {
        res.status(400).json({ error: 'No visa status templates configured' });
        return;
      }
      const normalizedPhone = normalizePhoneDigits(clientInfo.phone);

      if (email) {
        // Email provided - try to find existing client by email in this company
        client = await Client.findOne({ where: { email, companyId } });
        if (!client && normalizedPhone) {
          // Fallback by phone to avoid duplicates when client was pre-created without email
          client = await Client.findOne({ where: { phone: normalizedPhone, companyId } });
        }
        if (!client) {
          client = await Client.create({
            companyId,
            name: clientInfo.name,
            email: email,
            phone: normalizedPhone || undefined,
            status: 'pending',
            visaStatusTemplateId: defaultVisaStatusTemplateId,
            assignedUserId,
          });
        } else {
          // Update existing client with new information
          const updateData: any = {};
          if (clientInfo.name) updateData.name = clientInfo.name;
          if (normalizedPhone) updateData.phone = normalizedPhone;
          if (email && !client.email) updateData.email = email;
          if (assignedUserId && !client.assignedUserId) updateData.assignedUserId = assignedUserId;
          if (Object.keys(updateData).length > 0) {
            await client.update(updateData);
          }
        }
        clientId = client.id;
      } else {
        // No email provided - first try to find existing client by phone
        if (normalizedPhone) {
          client = await Client.findOne({ where: { phone: normalizedPhone, companyId } });
        }
        if (!client) {
          client = await Client.create({
            companyId,
            name: clientInfo.name,
            email: undefined,
            phone: normalizedPhone || undefined,
            status: 'pending',
            visaStatusTemplateId: defaultVisaStatusTemplateId,
            assignedUserId,
          });
        } else {
          // Update existing client with latest info from form
          const updateData: any = {};
          if (clientInfo.name) updateData.name = clientInfo.name;
          if (normalizedPhone) updateData.phone = normalizedPhone;
          if (assignedUserId && !client.assignedUserId) updateData.assignedUserId = assignedUserId;
          if (Object.keys(updateData).length > 0) {
            await client.update(updateData);
          }
        }
        clientId = client.id;
      }

      // Create submission with status 'in_progress'
      const submission = await FormSubmission.create({
        companyId,
        formId,
        formName: form.name,
        respondentName: clientInfo.name,
        respondentEmail: email,
        respondentPhone: normalizedPhone,
        answers: {},
        clientId,
        status: 'in_progress',
      });

      // Update session with clientId and submissionId
      await session.update({
        clientId,
        submissionId: submission.id,
      });

      console.log(`Created submission ${submission.id} from session ${sessionId} for client ${clientId}`);

      res.status(201).json(submission);
    } catch (error) {
      console.error('Create submission from session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];

/**
 * Get submission by session (public). Used to restore answers on page reload
 * without storing large base64 payloads in session progress.
 */
export const getSubmissionBySession = async (req: Request, res: Response): Promise<void> => {
  try {
    const formId = req.params.id;
    const { sessionId } = req.params;

    const session = await FormSession.findOne({
      where: { id: sessionId, formId },
    });

    if (!session || !session.submissionId) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    const submission = await FormSubmission.findByPk(session.submissionId);
    if (!submission) {
      res.status(404).json({ error: 'Submission not found' });
      return;
    }

    res.json(submission);
  } catch (error) {
    console.error('Get submission by session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a submission from a form session (public endpoint)
 * Called when user advances sections or completes the form
 */
export const updateSubmissionFromSession = [
  body('answers').optional().isObject().withMessage('Answers must be an object'),
  body('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled']),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const formId = req.params.id;
      const { sessionId } = req.params;
      const { answers, status } = req.body;

      // Validate session exists and belongs to this form
      const session = await FormSession.findOne({
        where: { id: sessionId, formId },
      });

      if (!session) {
        res.status(404).json({ error: 'Session not found or invalid' });
        return;
      }

      if (!session.submissionId) {
        res.status(400).json({ error: 'No submission found for this session. Please start the form first.' });
        return;
      }

      // Get the submission
      const submission = await FormSubmission.findByPk(session.submissionId);
      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      // Prepare update data
      const updateData: any = {};

      // Merge answers if provided
      if (answers) {
        // MySQL/Sequelize sometimes returns JSON columns as string - must parse to avoid
        // spreading a string (which would create {0:"{", 1:"\"", ...} and explode payload size)
        let currentAnswers: Record<string, any> = {};
        const rawAnswers = submission.answers;
        if (rawAnswers) {
          if (typeof rawAnswers === 'string') {
            try {
              currentAnswers = (JSON.parse(rawAnswers) as Record<string, any>) || {};
            } catch {
              currentAnswers = {};
            }
          } else if (typeof rawAnswers === 'object' && !Array.isArray(rawAnswers)) {
            // Detect corrupted data: object with numeric string keys from accidental string spread
            const keys = Object.keys(rawAnswers);
            const isCorrupted = keys.length > 100 && keys.every((k) => /^\d+$/.test(k));
            currentAnswers = isCorrupted ? {} : (rawAnswers as Record<string, any>);
          }
        }

        const finalAnswers = answers && typeof answers === 'object' && !Array.isArray(answers) ? answers : {};

        // Normalize answers format
        const normalizedAnswers: Record<string, any> = {};
        Object.entries(finalAnswers).forEach(([questionId, answerData]) => {
          if (answerData && typeof answerData === 'object' && !Array.isArray(answerData) && 'question' in answerData) {
            normalizedAnswers[questionId] = answerData;
          } else {
            normalizedAnswers[questionId] = {
              questionId,
              answer: answerData,
            };
          }
        });

        const mergedAnswers = { ...currentAnswers, ...normalizedAnswers };

        // Prevent max_allowed_packet error: cap at 64MB to allow forms with file uploads (base64).
        // MySQL default is 16MB - increase with: SET GLOBAL max_allowed_packet=67108864;
        const MAX_ANSWERS_SIZE = 64 * 1024 * 1024;
        const answersJson = JSON.stringify(mergedAnswers);
        if (answersJson.length > MAX_ANSWERS_SIZE) {
          console.error(`Answers payload too large: ${answersJson.length} bytes (max ${MAX_ANSWERS_SIZE})`);
          res.status(413).json({
            error: 'Las respuestas del formulario exceden el tamaño máximo permitido. Por favor, reduce el tamaño de archivos adjuntos o textos muy largos.',
          });
          return;
        }

        updateData.answers = mergedAnswers;
      }

      // Update status if provided
      if (status) {
        updateData.status = status;
      }

      // Update the submission
      await submission.update(updateData);

      // Update client's formsCompleted count if status changed to pending/completed
      if (status === 'pending' || status === 'completed') {
        if (submission.clientId) {
          const client = await Client.findByPk(submission.clientId);
          if (client) {
            const count = await FormSubmission.count({
              where: {
                clientId: submission.clientId,
                status: { [Op.in]: ['pending', 'in_progress', 'completed'] },
              },
            });
            await client.update({ formsCompleted: count });
            console.log(`Updated client ${submission.clientId} formsCompleted to ${count}`);
          }
        }
      }

      console.log(`Updated submission ${submission.id} from session ${sessionId}`);

      res.json(submission);
    } catch (error) {
      console.error('Update submission from session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
];
