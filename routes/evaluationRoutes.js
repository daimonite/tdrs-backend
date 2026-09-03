import express from 'express';
import { 
  submitEvaluationSurvey, 
  getEvaluationResults, 
  getScheduleCImpactReport 
} from '../controllers/evaluationController.js';

const router = express.Router();

router.post('/survey', submitEvaluationSurvey);
router.get('/results', getEvaluationResults);
router.get('/impact-report', getScheduleCImpactReport);

export default router;
