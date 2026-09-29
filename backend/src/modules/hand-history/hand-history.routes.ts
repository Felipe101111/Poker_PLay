import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { ApiError } from '../../shared/errors.js';
import { parseAnalyticsQuery, parseHandHistoryQuery } from './hand-history.validation.js';
import { handHistoryService } from './hand-history.service.js';

export const handHistoryRouter = Router();
handHistoryRouter.use(requireAuth);

handHistoryRouter.get('/analytics', async (req, res, next) => {
  try { res.status(200).json(await handHistoryService.analytics(req.session.userId!, parseAnalyticsQuery(req.query))); }
  catch (error) { next(error instanceof Error && !(error instanceof ApiError) ? new ApiError(400, 'VALIDATION_ERROR', error.message) : error); }
});

handHistoryRouter.get('/', async (req, res, next) => {
  try { res.status(200).json(await handHistoryService.list(req.session.userId!, parseHandHistoryQuery(req.query))); }
  catch (error) { next(error instanceof Error && !(error instanceof ApiError) ? new ApiError(400, 'VALIDATION_ERROR', error.message) : error); }
});

handHistoryRouter.get('/:historyId/replay', async (req, res, next) => {
  try { res.status(200).json(await handHistoryService.replay(req.session.userId!, req.params.historyId)); } catch (error) { next(error); }
});

handHistoryRouter.get('/:historyId', async (req, res, next) => {
  try { res.status(200).json(await handHistoryService.detail(req.session.userId!, req.params.historyId)); } catch (error) { next(error); }
});

handHistoryRouter.delete('/:historyId', async (req, res, next) => {
  try { res.status(200).json(await handHistoryService.remove(req.session.userId!, req.params.historyId)); } catch (error) { next(error); }
});