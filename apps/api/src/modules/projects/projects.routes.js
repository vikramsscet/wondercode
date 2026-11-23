import { Router } from 'express';
import { requireOwner } from '../../middleware/requireOwner.js';
import { validate } from '../../middleware/validate.js';
import { sendSuccess } from '../../utils/response.js';
import { generateBody, projectIdParams, validateBody } from './projects.schemas.js';
import { experimentBody } from './experiments.schemas.js';
import { runExperiment } from './experiments.service.js';
import * as service from './projects.service.js';
import { explainBody, listQuery } from '../explanations/explanations.schemas.js';
import * as explanations from '../explanations/explanations.service.js';

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

  // Static validation only: files are parsed, never executed, and nothing is saved.
  router.post('/validate', validate({ body: validateBody }), (req, res) => {
    sendSuccess(req, res, service.validateFiles(req.validated.body.files));
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

  router.post(
    '/:projectId/experiments',
    validate({ params: projectIdParams, body: experimentBody }),
    async (req, res, next) => {
      try {
        const { projectId } = req.validated.params;
        sendSuccess(
          req,
          res,
          await runExperiment(ctx(req), req.owner, projectId, req.validated.body),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/:projectId/explanations',
    validate({ params: projectIdParams, body: explainBody }),
    async (req, res, next) => {
      try {
        const { projectId } = req.validated.params;
        sendSuccess(
          req,
          res,
          await explanations.explainLines(ctx(req), req.owner, projectId, req.validated.body),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/:projectId/explanations',
    validate({ params: projectIdParams, query: listQuery }),
    async (req, res, next) => {
      try {
        sendSuccess(
          req,
          res,
          await explanations.listForProject(
            ctx(req),
            req.owner,
            req.validated.params.projectId,
            req.validated.query.versionId,
          ),
        );
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
