import { Router } from 'express';
import authRoutes from './auth.routes';
import usersRoutes from './users.routes';
import clientsRoutes from './clients.routes';
import formsRoutes from './forms.routes';
import submissionsRoutes from './submissions.routes';
import checklistRoutes from './checklist.routes';
import notesRoutes from './notes.routes';
import messagesRoutes from './messages.routes';
import faqsRoutes from './faqs.routes';
import botRoutes from './bot.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/forms', formsRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/checklist', checklistRoutes);
router.use('/notes', notesRoutes);
router.use('/messages', messagesRoutes);
router.use('/faqs', faqsRoutes);
router.use('/bot', botRoutes);

export default router;
