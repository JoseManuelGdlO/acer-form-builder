import { Router } from 'express';
import * as branchesController from '../controllers/branches.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', branchesController.getAllBranches);
router.post('/', branchesController.createBranch);
router.put('/:id', branchesController.updateBranch);
router.delete('/:id', branchesController.deleteBranch);

export default router;

