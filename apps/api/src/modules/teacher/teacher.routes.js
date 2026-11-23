import { Router } from 'express';
import { requireOwner } from '../../middleware/requireOwner.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { askBody, conversationParams, conversationsQuery } from './teacher.schemas.js';
import * as service from './teacher.service.js';

// Mounted at /teacher. Children (parent JWT + X-Child-Id) and guests (X-Guest-Token).
export function createTeacherRouter(config) {
  const router = Router();
  router.use(requireOwner(config));
  const ctx = (req) => ({
    supabase: req.app.locals.supabase,
    ai: req.app.locals.ai,
    config,
    logger: req.log,
  });

  router.post('/ask', validate({ body: askBody }), async (req, res, next) => {
    try {
      sendSuccess(
        req,
        res,
        await service.askTeacher(
          ctx(req),
          req.owner,
          req.guest ? null : req.child,
          req.validated.body,
        ),
      );
    } catch (err) {
      next(err);
    }
  });

  router.get('/conversations', validate({ query: conversationsQuery }), async (req, res, next) => {
    try {
      sendSuccess(
        req,
        res,
        await service.getConversation(ctx(req), req.owner, req.validated.query.projectId),
      );
    } catch (err) {
      next(err);
    }
  });

  router.delete(
    '/conversations/:conversationId',
    validate({ params: conversationParams }),
    async (req, res, next) => {
      try {
        sendSuccess(
          req,
          res,
          await service.clearConversation(ctx(req), req.owner, req.validated.params.conversationId),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
