import { z } from 'zod';
import { AppError } from '../utils/AppError.js';
import { getOwnedChild } from '../modules/children/children.service.js';

const uuid = z.string().uuid();

// Resolves the child a request acts on (":childId" in the URL, else the "X-Child-Id" header),
// verifies it belongs to the authenticated parent, and sets req.child. Use after requireAuth.
// The frontend's choice of active child is never trusted on its own.
export async function requireOwnedChild(req, res, next) {
  try {
    const raw = req.params.childId ?? req.get('x-child-id');
    const parsed = uuid.safeParse(raw);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'A valid child profile is required.', [
        {
          in: req.params.childId ? 'params' : 'header',
          field: 'childId',
          message: 'Invalid child id.',
        },
      ]);
    }
    req.child = await getOwnedChild(req.app.locals.supabase, req.auth.userId, parsed.data);
    next();
  } catch (err) {
    next(err);
  }
}
