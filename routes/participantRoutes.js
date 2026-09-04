import express from 'express';
import { 
  getParticipantProfile, 
  updateParticipantProfile, 
  getParticipantOrders, 
  getParticipantTickets, 
  getParticipantCertificates,
  getParticipantTraining,
  getParticipantWishlist,
  toggleWishlistItem,
  getParticipantOrderTracking,
  confirmMerchandisePickup,
  getParticipantPreferences,
  updateParticipantPreferences
} from '../controllers/participantController.js';
import auth from '../middleware/auth.js';
import { requireRole } from '../middleware/rbac.js';

const router = express.Router();

router.use(auth());

router.get('/profile', getParticipantProfile);
router.put('/profile', updateParticipantProfile);
router.get('/orders', getParticipantOrders);
router.get('/tickets', getParticipantTickets);
router.get('/certificates', getParticipantCertificates);
router.get('/training', getParticipantTraining);
router.get('/wishlist', getParticipantWishlist);
router.post('/wishlist/toggle', toggleWishlistItem);
router.get('/orders/:order_id/tracking', getParticipantOrderTracking);
// Pickup confirmation is performed by pickup-desk staff scanning a
// participant's order, not by the participant themselves.
router.post('/orders/:order_id/pickup', requireRole(['volunteer', 'admin']), confirmMerchandisePickup);
router.get('/preferences', getParticipantPreferences);
router.put('/preferences', updateParticipantPreferences);

export default router;
