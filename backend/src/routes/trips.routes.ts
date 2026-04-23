import { Router } from 'express';
import * as tripsController from '../controllers/trips.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/', tripsController.getAllTrips);
router.get('/invitations', tripsController.getTripInvitations);
router.post('/invitations/:id/accept', tripsController.acceptTripInvitation);
router.post('/invitations/:id/reject', tripsController.rejectTripInvitation);
router.get('/:id/change-log', tripsController.getTripChangeLog);
router.get('/:id', tripsController.getTripById);
router.post('/', tripsController.createTrip);
router.put('/:id', tripsController.updateTrip);
router.delete('/:id', tripsController.deleteTrip);
router.post('/:id/participants', tripsController.addParticipants);
router.delete('/:id/participants/:participantId', tripsController.removeParticipant);
router.post('/:id/seat-assignments', tripsController.setSeatAssignment);
router.delete('/:id/seat-assignments', tripsController.resetSeatAssignments);
router.delete('/:id/seat-assignments/by-seat', tripsController.clearSeatAssignment);
router.delete('/:id/seat-assignments/:participantId', tripsController.clearSeatAssignment);

export default router;
