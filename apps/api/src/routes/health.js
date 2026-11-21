import { Router } from 'express';
import { sendSuccess } from '../utils/response.js';

const router = Router();

router.get('/', (req, res) =>
  sendSuccess(req, res, { status: 'ok', uptimeSeconds: Math.round(process.uptime()) }),
);

export default router;
