import { Router } from 'express';
import * as publicController from '../controllers/public.controller';

const router = Router();

router.get('/tenant', publicController.getTenantByDomain);

export default router;
