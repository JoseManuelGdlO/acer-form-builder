import { Router } from 'express';
import * as submissionsController from '../controllers/submissions.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Protected routes (only login and form-session submission are public)
router.use(authenticate);

router.post('/', submissionsController.createSubmission);
router.get('/', submissionsController.getAllSubmissions);
router.get('/stats', submissionsController.getSubmissionStats);
router.get('/:id', submissionsController.getSubmissionById);
router.put('/:id', submissionsController.updateSubmission);
router.delete('/:id', submissionsController.deleteSubmission);

export default router;
