import { Router } from 'express';
import authRoutes from './auth.routes';
import publicRoutes from './public.routes';
import companiesRoutes from './companies.routes';
import usersRoutes from './users.routes';
import clientsRoutes from './clients.routes';
import groupsRoutes from './groups.routes';
import formsRoutes from './forms.routes';
import submissionsRoutes from './submissions.routes';
import checklistRoutes from './checklist.routes';
import notesRoutes from './notes.routes';
import paymentsRoutes from './payments.routes';
import messagesRoutes from './messages.routes';
import faqsRoutes from './faqs.routes';
import botRoutes from './bot.routes';
import conversacionesChatRoutes from './conversations.routes';
import productsRoutes from './products.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/public', publicRoutes);
router.use('/companies', companiesRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/groups', groupsRoutes);
router.use('/forms', formsRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/checklist', checklistRoutes);
router.use('/notes', notesRoutes);
router.use('/payments', paymentsRoutes);
router.use('/messages', messagesRoutes);
router.use('/faqs', faqsRoutes);
router.use('/bot', botRoutes);
router.use('/addChat', conversacionesChatRoutes);
router.use('/products', productsRoutes);

export default router;
