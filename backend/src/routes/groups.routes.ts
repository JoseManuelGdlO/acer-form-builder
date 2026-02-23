import { Router } from 'express';
import * as groupsController from '../controllers/groups.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', groupsController.getAllGroups);
router.get('/:id', groupsController.getGroupById);
router.post('/', groupsController.createGroup);
router.put('/:id', groupsController.updateGroup);
router.delete('/:id', groupsController.deleteGroup);

export default router;
