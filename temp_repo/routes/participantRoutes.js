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

const router = express.Router();

router.get('/profile', getParticipantProfile);
router.put('/profile', updateParticipantProfile);
router.get('/orders', getParticipantOrders);
router.get('/tickets', getParticipantTickets);
router.get('/certificates', getParticipantCertificates);
router.get('/training', getParticipantTraining);
router.get('/wishlist', getParticipantWishlist);
router.post('/wishlist/toggle', toggleWishlistItem);
router.get('/orders/:order_id/tracking', getParticipantOrderTracking);
router.post('/orders/:order_id/pickup', confirmMerchandisePickup);
router.get('/preferences', getParticipantPreferences);
router.put('/preferences', updateParticipantPreferences);

export default router;
