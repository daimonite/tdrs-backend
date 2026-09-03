import express from 'express';
import { getMyCollectible, verifyCertificateByHash } from '../controllers/collectibleController.js';

const router = express.Router();

// Public verification for QR codes on certificates
router.get('/verify/:hash', verifyCertificateByHash);
router.get('/my-certificate', getMyCollectible);

export default router;
