import { Router } from 'express';
import * as controller from '../controllers/internal-appointments.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.put('/:appointmentId', controller.updateInternalAppointment);
router.delete('/:appointmentId', controller.deleteInternalAppointment);
router.get('/:appointmentId/history', controller.getInternalAppointmentHistory);

export default router;
