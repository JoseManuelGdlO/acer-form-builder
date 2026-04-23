import { Router } from 'express';
import * as staffController from '../controllers/staff.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission('trips.view'), staffController.listStaffMembers);
router.post('/', requireAnyPermission('trips.participants_manage'), staffController.createStaffMember);
router.put('/:id', requireAnyPermission('trips.participants_manage'), staffController.updateStaffMember);
router.delete('/:id', requireAnyPermission('trips.office_admin'), staffController.deleteStaffMember);

export default router;
