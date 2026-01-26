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
          attributes: ['id', 'name'],
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

      const { formId, formName, respondentName, respondentEmail, answers, clientId } = req.body;

      // Try to find or create client by email
      let finalClientId = clientId;
      if (!finalClientId && respondentEmail) {
        let client = await Client.findOne({ where: { email: respondentEmail } });
        if (!client) {
          client = await Client.create({
            name: respondentName,
            email: respondentEmail,
            status: 'pending',
          });
        }
        finalClientId = client.id;
      }

      const submission = await FormSubmission.create({
        formId,
        formName,
        respondentName,
        respondentEmail,
        answers: answers || {},
        clientId: finalClientId,
        status: 'pending',
      });

      // Update client's formsCompleted count
      if (finalClientId) {
        const client = await Client.findByPk(finalClientId);
        if (client) {
          const count = await FormSubmission.count({
            where: { clientId: finalClientId, status: 'completed' },
          });
          await client.update({ formsCompleted: count });
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

      // Update client's formsCompleted count if status changed to completed
      if (req.body.status === 'completed' && submission.clientId) {
        const client = await Client.findByPk(submission.clientId);
        if (client) {
          const count = await FormSubmission.count({
            where: { clientId: submission.clientId, status: 'completed' },
          });
          await client.update({ formsCompleted: count });
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
