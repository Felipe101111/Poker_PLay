import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { friendsService } from './friends.service.js';
import { searchSchema, sendRequestSchema } from './friends.validation.js';
import { ApiError } from '../../shared/errors.js';

export const friendsRouter = Router();

friendsRouter.use(requireAuth);

friendsRouter.get('/search', async (req, res, next) => {
  const parsed = searchSchema.safeParse({ query: req.query.query });
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }
  try {
    const results = await friendsService.search(parsed.data, req.session.userId!);
    res.status(200).json(results);
  } catch (err) {
    next(err);
  }
});

friendsRouter.post('/requests', async (req, res, next) => {
  const parsed = sendRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }
  try {
    const result = await friendsService.sendRequest(parsed.data, req.session.userId!);
    const status = result.status === 'ACCEPTED' ? 200 : 201;
    res.status(status).json(result);
  } catch (err) {
    next(err);
  }
});

friendsRouter.get('/requests', async (req, res, next) => {
  try {
    const result = await friendsService.listRequests(req.session.userId!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

friendsRouter.post('/requests/:id/accept', async (req, res, next) => {
  try {
    const result = await friendsService.accept(req.params.id, req.session.userId!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

friendsRouter.post('/requests/:id/reject', async (req, res, next) => {
  try {
    const result = await friendsService.reject(req.params.id, req.session.userId!);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

friendsRouter.delete('/requests/:id', async (req, res, next) => {
  try {
    await friendsService.cancelRequest(req.params.id, req.session.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

friendsRouter.get('/', async (req, res, next) => {
  try {
    const friends = await friendsService.listFriends(req.session.userId!);
    res.status(200).json(friends);
  } catch (err) {
    next(err);
  }
});

friendsRouter.delete('/:userId', async (req, res, next) => {
  try {
    await friendsService.removeFriend(req.params.userId, req.session.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

