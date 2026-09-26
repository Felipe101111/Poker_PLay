import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { ApiError } from '../../shared/errors.js';
import { multiplayerService } from './multiplayer.service.js';
import { reconnectSchema, roomTableParamsSchema, tableActionSchema } from './multiplayer.validation.js';

export const multiplayerRouter = Router();
multiplayerRouter.use(requireAuth);

multiplayerRouter.get('/:roomId/table', async (req, res, next) => {
  const parsed = roomTableParamsSchema.safeParse(req.params);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid room id'));
    return;
  }
  try {
    res.status(200).json(await multiplayerService.getTable(parsed.data.roomId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

multiplayerRouter.post('/:roomId/table/reconnect', async (req, res, next) => {
  const params = roomTableParamsSchema.safeParse(req.params);
  const body = reconnectSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    const issueMessage = !params.success
      ? params.error.issues[0]?.message
      : !body.success
        ? body.error.issues[0]?.message
        : undefined;
    next(new ApiError(400, 'VALIDATION_ERROR', issueMessage ?? 'Invalid reconnect request'));
    return;
  }
  try {
    res.status(200).json(await multiplayerService.reconnect(params.data.roomId, req.session.userId!, body.data));
  } catch (error) {
    next(error);
  }
});

multiplayerRouter.post('/:roomId/table/actions', async (req, res, next) => {
  const params = roomTableParamsSchema.safeParse(req.params);
  const body = tableActionSchema.safeParse(req.body);
  if (!params.success || !body.success) {
    const issueMessage = !params.success
      ? params.error.issues[0]?.message
      : !body.success
        ? body.error.issues[0]?.message
        : undefined;
    next(new ApiError(400, 'VALIDATION_ERROR', issueMessage ?? 'Invalid table action'));
    return;
  }
  try {
    res.status(200).json(await multiplayerService.act(params.data.roomId, req.session.userId!, body.data));
  } catch (error) {
    next(error);
  }
});
