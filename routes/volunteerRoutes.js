import express from 'express';
import { getMyVolunteerShift, acknowledgeBriefing } from '../controllers/volunteerController.js';
import { checkInTicket } from '../controllers/ticketController.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(requireRole(['volunteer', 'admin']));

router.get('/shift', getMyVolunteerShift);
router.post('/briefing/acknowledge', acknowledgeBriefing);
router.post('/checkin-ticket', checkInTicket);

export default router;
