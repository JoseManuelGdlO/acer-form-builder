import { Router } from 'express';
import * as hotelsController from '../controllers/hotels.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAnyPermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/', requireAnyPermission('hotels.view'), hotelsController.getAllHotels);
router.get('/:id', requireAnyPermission('hotels.view'), hotelsController.getHotelById);
router.post('/', requireAnyPermission('hotels.create'), hotelsController.createHotel);
router.put('/:id', requireAnyPermission('hotels.update'), hotelsController.updateHotel);
router.delete('/:id', requireAnyPermission('hotels.delete'), hotelsController.deleteHotel);

export default router;
