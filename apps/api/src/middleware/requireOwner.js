import { requireAuth } from './requireAuth.js';
import { requireGuest } from './requireGuest.js';
import { requireOwnedChild } from './requireOwnedChild.js';

// For routes both children and guests may use. Sets req.owner = { childProfileId } | { guestSessionId }.
//  - X-Guest-Token present: guest session only (parent JWTs are never mixed in).
//  - Otherwise: signed-in parent + X-Child-Id, verified to belong to that parent (req.child).
export const requireOwner = (config) => {
  const guest = requireGuest(config);
  return (req, res, next) => {
    const done = (err) => {
      if (err) return next(err);
      req.owner = req.guest ? { guestSessionId: req.guest.id } : { childProfileId: req.child.id };
      return next();
    };
    if (req.get('x-guest-token')) return guest(req, res, done);
    return requireAuth(req, res, (err) => (err ? next(err) : requireOwnedChild(req, res, done)));
  };
};
