import { Router } from 'express';
import * as clientsController from '../controllers/clients.controller';
import * as internalAppointmentsController from '../controllers/internal-appointments.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', clientsController.getAllClients);
router.get('/stats', clientsController.getClientStats);
router.get('/:id/amount-due-history', clientsController.getClientAmountDueHistory);
router.get('/:id/payment-deleted-history', clientsController.getClientPaymentDeletedHistory);
router.get('/:id/internal-appointments', internalAppointmentsController.getClientInternalAppointments);
router.post('/:id/internal-appointments', internalAppointmentsController.createClientInternalAppointment);
router.get('/:id/acquired-packages', clientsController.getClientAcquiredPackages);
router.post('/:id/acquired-packages', clientsController.createClientAcquiredPackage);
router.delete('/:id/acquired-packages/:packageId', clientsController.deleteClientAcquiredPackage);
router.get('/:id', clientsController.getClientById);
router.post('/', clientsController.createClient);
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

export default router;
