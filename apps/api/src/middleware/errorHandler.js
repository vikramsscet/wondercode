import { AppError } from '../utils/AppError.js';
import { errorBody } from '../utils/response.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource was not found.'));
}

// Central error handler. Never leaks stack traces or internal messages.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong. Please try again.';
  let details = [];

  if (err instanceof AppError) {
    ({ status, code, message, details } = err);
  } else if (err?.type === 'entity.parse.failed') {
    status = 400;
    code = 'INVALID_JSON';
    message = 'The request body is not valid JSON.';
  } else if (err?.type === 'entity.too.large') {
    status = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'The request body is too large.';
  }

  (req.log ?? console)[status >= 500 ? 'error' : 'warn']({ err }, 'request failed');
  res.status(status).json(errorBody(req, code, message, details));
}
