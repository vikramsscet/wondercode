import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { sendSuccess } from '../../utils/response.js';
import { getParentContext } from './auth.service.js';

const router = Router();

// Current authenticated parent. Sign-up/sign-in/sign-out are Supabase Auth client flows.
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    sendSuccess(req, res, await getParentContext(req.app.locals.supabase, req.auth));
  } catch (err) {
    next(err);
  }
});

export default router;
