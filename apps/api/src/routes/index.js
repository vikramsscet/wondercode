import { Router } from 'express';
import health from './health.js';

// Mounted at /api/v1. Feature routers are added here by later prompts.
const router = Router();
router.use('/health', health);

export default router;
