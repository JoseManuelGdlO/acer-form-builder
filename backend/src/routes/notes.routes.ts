import { Router } from 'express';
import * as notesController from '../controllers/notes.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/clients/:clientId', notesController.getClientNotes);
router.post('/clients/:clientId', notesController.createNote);
router.put('/:id', notesController.updateNote);
router.delete('/:id', notesController.deleteNote);

export default router;
