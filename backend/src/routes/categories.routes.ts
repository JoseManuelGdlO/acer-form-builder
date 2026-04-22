import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';
import * as categoriesController from '../controllers/categories.controller';

const router = Router();

router.use(authenticate);

router.get('/', categoriesController.getCategories);
router.post('/', requireAnyPermission('categories.create'), categoriesController.createCategory);
router.put('/:id', requireAnyPermission('categories.update'), categoriesController.updateCategory);
router.delete('/:id', requireAnyPermission('categories.delete'), categoriesController.deleteCategory);

export default router;

