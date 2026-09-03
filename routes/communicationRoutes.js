import express from 'express';
import { 
  getTemplates, 
  previewTemplate, 
  sendTestCommunication, 
  getCommunicationLogs 
} from '../controllers/communicationController.js';

const router = express.Router();

router.get('/templates', getTemplates);
router.post('/preview', previewTemplate);
router.post('/send-test', sendTestCommunication);
router.get('/logs', getCommunicationLogs);

export default router;
