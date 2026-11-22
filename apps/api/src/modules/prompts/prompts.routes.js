import { Router } from 'express';
import { requireOwner } from '../../middleware/requireOwner.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { analyzeBody, planBody } from './prompts.schemas.js';
import { analyzePrompt } from './prompts.service.js';
import { createPlan } from './plans.service.js';

// Mounted at /prompts: POST /analyze (Prompt 15) and POST /plan (Prompt 16). Guests (X-Guest-Token) and signed-in parents acting for an owned child
// (Authorization + X-Child-Id) can both analyse prompts. Parent JWTs are not valid guest tokens.
export function createPromptsRouter(config) {
  const router = Router();
  const identify = requireOwner(config);

  router.post('/analyze', identify, validate({ body: analyzeBody }), async (req, res, next) => {
    try {
      const owner = req.owner;
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

  router.post('/plan', identify, validate({ body: planBody }), async (req, res, next) => {
    try {
      const owner = req.owner;
      const result = await createPlan(
        { ai: req.app.locals.ai, supabase: req.app.locals.supabase, logger: req.log },
        owner,
        req.validated.body,
        req.guest ? null : req.child,
      );
      sendSuccess(req, res, result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
