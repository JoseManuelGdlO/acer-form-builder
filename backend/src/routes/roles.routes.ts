import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as rolesController from '../controllers/roles.controller';

const router = Router();

router.use(authenticate);

router.get('/catalog', rolesController.getPermissionCatalog);
router.get('/', rolesController.listRoles);
router.post('/', rolesController.createRole);
router.put('/:id', rolesController.updateRole);
router.delete('/:id', rolesController.deleteRole);

export default router;
