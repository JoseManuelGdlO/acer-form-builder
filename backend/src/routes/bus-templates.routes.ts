import { Router } from 'express';
import * as busTemplatesController from '../controllers/bus-templates.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', busTemplatesController.getAllBusTemplates);
router.get('/:id', busTemplatesController.getBusTemplateById);
router.post('/', busTemplatesController.createBusTemplate);
router.put('/:id', busTemplatesController.updateBusTemplate);
router.delete('/:id', busTemplatesController.deleteBusTemplate);

export default router;
