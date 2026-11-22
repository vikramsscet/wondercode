import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireGuest } from '../../middleware/requireGuest.js';
import { requireOwnedChild } from '../../middleware/requireOwnedChild.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { analyzeBody } from './prompts.schemas.js';
import { analyzePrompt } from './prompts.service.js';

// Mounted at /prompts. Guests (X-Guest-Token) and signed-in parents acting for an owned child
// (Authorization + X-Child-Id) can both analyse prompts. Parent JWTs are not valid guest tokens.
export function createPromptsRouter(config) {
  const router = Router();
  const guard = requireGuest(config);

  const identify = (req, res, next) => {
    if (req.get('x-guest-token')) return guard(req, res, next);
    return requireAuth(req, res, (err) => (err ? next(err) : requireOwnedChild(req, res, next)));
  };

  router.post('/analyze', identify, validate({ body: analyzeBody }), async (req, res, next) => {
    try {
      const owner = req.guest ? { guestSessionId: req.guest.id } : { childProfileId: req.child.id };
      const result = await analyzePrompt(
        { supabase: req.app.locals.supabase, logger: req.log },
        owner,
        req.validated.body,
      );
      sendSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
