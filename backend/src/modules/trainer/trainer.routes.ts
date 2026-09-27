import { Router } from 'express';
import { ApiError } from '../../shared/errors.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { trainerService } from './trainer.service.js';
import { decisionSchema, nextScenarioSchema, startSessionSchema } from './trainer.validation.js';

export const trainerRouter = Router();
trainerRouter.use(requireAuth);

trainerRouter.post('/session/start', async (req, res, next) => {
  const parsed = startSessionSchema.safeParse(req.body ?? {});
  if (!parsed.success) { next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid trainer session')); return; }
  try { res.status(200).json(await trainerService.startOrResume(req.session.userId!)); } catch (error) { next(error); }
});

trainerRouter.get('/session', async (req, res, next) => {
  try { res.status(200).json(await trainerService.current(req.session.userId!)); } catch (error) { next(error); }
});

trainerRouter.post('/session/decisions', async (req, res, next) => {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) { next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid trainer decision')); return; }
  try { const result = await trainerService.decide(req.session.userId!, parsed.data); res.status(result.duplicate ? 200 : 201).json(result); } catch (error) { next(error); }
});

trainerRouter.post('/session/next', async (req, res, next) => {
  const parsed = nextScenarioSchema.safeParse(req.body);
  if (!parsed.success) { next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid next scenario request')); return; }
  try { res.status(201).json(await trainerService.next(req.session.userId!, parsed.data)); } catch (error) { next(error); }
});

trainerRouter.get('/progress', async (req, res, next) => {
  try { res.status(200).json(await trainerService.progress(req.session.userId!)); } catch (error) { next(error); }
});
