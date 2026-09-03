import express from 'express';
import { getMyTickets, getTicketByQrToken, checkInTicket } from '../controllers/ticketController.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', getMyTickets);
router.get('/qr/:qr_token', getTicketByQrToken);
router.post('/checkin', requireRole(['volunteer', 'admin']), checkInTicket);

export default router;
