import { Router } from 'express';
import {
  health,
  status,
  proxyEvaluation,
  storeResponse,
} from '../controllers/evaluationController.js';

const router = Router();

router.get('/health', health);
router.get('/status', status);
router.post('/run-evaluation', proxyEvaluation);
router.post('/run-evaluation-demo', proxyEvaluation);
router.post('/responses', storeResponse);

export default router;
