import { Router } from 'express';
import * as calendarController from '../controllers/calendar.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.use(authenticate);

router.get('/events', calendarController.getCalendarEvents);
router.get('/events/by-date', calendarController.getCalendarEventsByDate);

export default router;
