import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { FormSubmission, Form, Client } from '../models';
import { AuthRequest } from '../middleware/auth.middleware';
import { Op } from 'sequelize';

export const getAllSubmissions = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { formId, clientId, status } = req.query;
    const where: any = {};

    if (formId) where.formId = formId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status;

    // If user is reviewer, only show submissions of assigned clients
    if (req.user && !req.user.roles.includes('super_admin')) {
      const assignedClients = await Client.findAll({
        where: { assignedUserId: req.user.id },
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

    const submission = await FormSubmission.findByPk(id, {
      include: [
        {
          model: Form,
          as: 'form',
        },
        {
          model: Client,
          as: 'client',
        },
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
  body('respondentEmail').isEmail().normalizeEmail(),
  body('answers').isObject().withMessage('Answers must be an object'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { formId, formName, respondentName, respondentEmail, respondentPhone, address, answers, clientId } = req.body;

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

      // Try to find or create client by email; save/update phone and address
      let finalClientId = clientId;
      if (!finalClientId && respondentEmail) {
        let client = await Client.findOne({ where: { email: respondentEmail } });
        if (!client) {
          client = await Client.create({
            name: respondentName,
            email: respondentEmail,
            phone: respondentPhone || undefined,
            address: address || undefined,
            status: 'pending',
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
      const submission = await FormSubmission.findByPk(id);

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
    const submission = await FormSubmission.findByPk(id);

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
    const where: any = {};

    // If user is reviewer, only count submissions of assigned clients
    if (req.user && !req.user.roles.includes('super_admin')) {
      const assignedClients = await Client.findAll({
        where: { assignedUserId: req.user.id },
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
