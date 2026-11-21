import { Router } from 'express';
import { requireAuth } from '../../middleware/requireAuth.js';
import { requireOwnedChild } from '../../middleware/requireOwnedChild.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { childIdParams, createChildBody, updateChildBody } from './children.schemas.js';
import * as service from './children.service.js';

const router = Router();
router.use(requireAuth);

const handler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

router.get(
  '/',
  handler(async (req, res) =>
    sendSuccess(req, res, await service.listChildren(req.app.locals.supabase, req.auth.userId)),
  ),
);

router.post(
  '/',
  validate({ body: createChildBody }),
  handler(async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.createChild(req.app.locals.supabase, req.auth.userId, req.validated.body),
      { status: 201 },
    ),
  ),
);

router.get(
  '/:childId',
  validate({ params: childIdParams }),
  requireOwnedChild,
  handler(async (req, res) => sendSuccess(req, res, req.child)),
);

router.patch(
  '/:childId',
  validate({ params: childIdParams, body: updateChildBody }),
  handler(async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.updateChild(
        req.app.locals.supabase,
        req.auth.userId,
        req.validated.params.childId,
        req.validated.body,
      ),
    ),
  ),
);

router.delete(
  '/:childId',
  validate({ params: childIdParams }),
  handler(async (req, res) =>
    sendSuccess(
      req,
      res,
      await service.deleteChild(
        req.app.locals.supabase,
        req.auth.userId,
        req.validated.params.childId,
      ),
    ),
  ),
);

export default router;
