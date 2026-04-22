import { Router } from 'express';
import * as usersController from '../controllers/users.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission('users.view'), usersController.getAllUsers);
router.get('/:id', requireAnyPermission('users.view'), usersController.getUserById);
router.post('/', requireAnyPermission('users.create'), usersController.createUser);
router.put('/:id', requireAnyPermission('users.update'), usersController.updateUser);
router.delete('/:id', requireAnyPermission('users.delete'), usersController.deleteUser);

export default router;
