import { Router } from 'express';
import * as branchesController from '../controllers/branches.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission('branches.view'), branchesController.getAllBranches);
router.post('/', requireAnyPermission('branches.create'), branchesController.createBranch);
router.put('/:id', requireAnyPermission('branches.update'), branchesController.updateBranch);
router.delete('/:id', requireAnyPermission('branches.delete'), branchesController.deleteBranch);

export default router;
