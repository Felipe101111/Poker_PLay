import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { ApiError } from '../../shared/errors.js';
import { multiplayerTrainingService } from './multiplayer.training.service.js';
import { trainingDecisionQuerySchema, trainingJoinSchema, trainingLeaveSchema, trainingRoomParamsSchema } from './multiplayer.training.validation.js';

export const multiplayerTrainingRouter = Router();
multiplayerTrainingRouter.use(requireAuth);

function validationError(message: string) {
  return new ApiError(400, 'VALIDATION_ERROR', message);
}

multiplayerTrainingRouter.post('/:roomId/training', async (req, res, next) => {
  const params = trainingRoomParamsSchema.safeParse(req.params);
  const body = trainingJoinSchema.safeParse(req.body);
  if (!params.success || !body.success) return next(validationError('Invalid training enrollment request'));
  try {
    res.status(200).json(await multiplayerTrainingService.join(params.data.roomId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

multiplayerTrainingRouter.get('/:roomId/training', async (req, res, next) => {
  const params = trainingRoomParamsSchema.safeParse(req.params);
  if (!params.success) return next(validationError(params.error.issues[0]?.message ?? 'Invalid room id'));
  try {
    res.status(200).json(await multiplayerTrainingService.get(params.data.roomId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

multiplayerTrainingRouter.get('/:roomId/training/decisions', async (req, res, next) => {
  const params = trainingRoomParamsSchema.safeParse(req.params);
  const query = trainingDecisionQuerySchema.safeParse(req.query);
  if (!params.success || !query.success) return next(validationError('Invalid training decision query'));
  try {
    res.status(200).json(await multiplayerTrainingService.decisions(params.data.roomId, req.session.userId!, query.data));
  } catch (error) {
    next(error);
  }
});

multiplayerTrainingRouter.post('/:roomId/training/leave', async (req, res, next) => {
  const params = trainingRoomParamsSchema.safeParse(req.params);
  const body = trainingLeaveSchema.safeParse(req.body ?? {});
  if (!params.success || !body.success) return next(validationError('Invalid training leave request'));
  try {
    res.status(200).json(await multiplayerTrainingService.leave(params.data.roomId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});
