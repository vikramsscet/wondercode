import { randomUUID } from 'node:crypto';

// Accept a sane caller-supplied ID for correlation; otherwise generate one.
const VALID = /^[A-Za-z0-9._-]{8,64}$/;

export function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  req.id = incoming && VALID.test(incoming) ? incoming : randomUUID();
  res.set('X-Request-Id', req.id);
  next();
}
