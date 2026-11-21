import { AppError } from '../utils/AppError.js';

// Validates req.params / req.query / req.body against zod schemas.
// Parsed (and coerced/stripped) values are exposed as req.validated.{params,query,body};
// handlers must read from req.validated, never from the raw request.
export const validate =
  (schemas = {}) =>
  (req, res, next) => {
    const validated = {};
    const details = [];

    for (const part of ['params', 'query', 'body']) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (result.success) {
        validated[part] = result.data;
      } else {
        for (const issue of result.error.issues) {
          details.push({ in: part, field: issue.path.join('.'), message: issue.message });
        }
      }
    }

    if (details.length > 0) {
      return next(
        new AppError(400, 'VALIDATION_ERROR', 'The request could not be processed.', details),
      );
    }
    req.validated = validated;
    return next();
  };
