import { Router } from 'express';
import { requireOwner } from '../../middleware/requireOwner.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { askBody } from './teacher.schemas.js';
import { askTeacher } from './teacher.service.js';

// Mounted at /teacher. Children (parent JWT + X-Child-Id) and guests (X-Guest-Token).
export function createTeacherRouter(config) {
  const router = Router();
  router.use(requireOwner(config));

  router.post('/ask', validate({ body: askBody }), async (req, res, next) => {
    try {
      const ctx = {
        supabase: req.app.locals.supabase,
        ai: req.app.locals.ai,
        logger: req.log,
      };
      sendSuccess(req, res, await askTeacher(ctx, req.owner, req.validated.body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
