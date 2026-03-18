import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import * as categoriesController from '../controllers/categories.controller';

const router = Router();

router.use(authenticate);

router.get('/', categoriesController.getCategories);
router.post('/', categoriesController.createCategory);
router.put('/:id', categoriesController.updateCategory);
router.delete('/:id', categoriesController.deleteCategory);

export default router;

