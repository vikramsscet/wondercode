import { Router } from 'express';
import { requireOwner } from '../../middleware/requireOwner.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { generateBody, projectIdParams } from './projects.schemas.js';
import * as service from './projects.service.js';

// Mounted at /projects. Children (parent JWT + X-Child-Id) and guests (X-Guest-Token) share these routes.
export function createProjectsRouter(config) {
  const router = Router();
  router.use(requireOwner(config));

  const ctx = (req) => ({
    supabase: req.app.locals.supabase,
    ai: req.app.locals.ai,
    config,
    logger: req.log,
  });

  router.post('/generate', validate({ body: generateBody }), async (req, res, next) => {
    try {
      sendSuccess(
        req,
        res,
        await service.generateProject(ctx(req), req.owner, req.validated.body),
        {
          status: 201,
        },
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/:projectId', validate({ params: projectIdParams }), async (req, res, next) => {
    try {
      sendSuccess(
        req,
        res,
        await service.getProject(ctx(req), req.owner, req.validated.params.projectId),
      );
    } catch (err) {
      next(err);
    }
  });

  return router;
}
