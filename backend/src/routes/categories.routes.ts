import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/role.middleware';
import * as categoriesController from '../controllers/categories.controller';

const router = Router();

router.use(authenticate);

router.get('/', categoriesController.getCategories);
router.post('/', requireAdmin, categoriesController.createCategory);
router.put('/:id', requireAdmin, categoriesController.updateCategory);
router.delete('/:id', requireAdmin, categoriesController.deleteCategory);

export default router;

