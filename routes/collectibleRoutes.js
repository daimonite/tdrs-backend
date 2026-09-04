import express from 'express';
import { getMyCollectible, verifyCertificateByHash } from '../controllers/collectibleController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Public verification for QR codes on certificates — intentionally unauthenticated
router.get('/verify/:hash', verifyCertificateByHash);
router.get('/my-certificate', auth(), getMyCollectible);

export default router;
