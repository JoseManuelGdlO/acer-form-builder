import { Router } from 'express';
import * as submissionsController from '../controllers/submissions.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public route for creating submissions
router.post('/', submissionsController.createSubmission);

// Protected routes
router.use(authenticate);

router.get('/', submissionsController.getAllSubmissions);
router.get('/stats', submissionsController.getSubmissionStats);
router.get('/:id', submissionsController.getSubmissionById);
router.put('/:id', submissionsController.updateSubmission);
router.delete('/:id', submissionsController.deleteSubmission);

export default router;
