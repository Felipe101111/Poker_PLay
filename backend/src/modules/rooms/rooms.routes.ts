import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { ApiError } from '../../shared/errors.js';
import { roomsService } from './rooms.service.js';
import { createRoomSchema, invitationIdSchema, invitationSchema, joinRoomSchema, readinessSchema, roomIdSchema } from './rooms.validation.js';

export const roomsRouter = Router();
roomsRouter.use(requireAuth);

function validationError(message: string) {
  return new ApiError(400, 'VALIDATION_ERROR', message);
}

roomsRouter.get('/', async (_req, res, next) => {
  try {
    res.status(200).json({ rooms: await roomsService.listPublicRooms() });
  } catch (error) {
    next(error);
  }
});

roomsRouter.get('/current', async (req, res, next) => {
  try {
    res.status(200).json({ room: await roomsService.getCurrentRoom(req.session.userId!) });
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/', async (req, res, next) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid room settings'));
  try {
    res.status(201).json(await roomsService.createRoom(parsed.data, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.get('/invitations', async (req, res, next) => {
  try {
    res.status(200).json({ invitations: await roomsService.listInvitations(req.session.userId!) });
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/invitations/:invitationId/accept', async (req, res, next) => {
  const parsed = invitationIdSchema.safeParse(req.params);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid invitation id'));
  try {
    res.status(200).json(await roomsService.acceptInvitation(parsed.data.invitationId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/invitations/:invitationId/decline', async (req, res, next) => {
  const parsed = invitationIdSchema.safeParse(req.params);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid invitation id'));
  try {
    await roomsService.declineInvitation(parsed.data.invitationId, req.session.userId!);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

roomsRouter.get('/:roomId', async (req, res, next) => {
  const parsed = roomIdSchema.safeParse(req.params);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid room id'));
  try {
    res.status(200).json(await roomsService.getRoomForViewer(parsed.data.roomId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/:roomId/join', async (req, res, next) => {
  const params = roomIdSchema.safeParse(req.params);
  const body = joinRoomSchema.safeParse(req.body ?? {});
  if (!params.success || !body.success) return next(validationError('Invalid room join request'));
  try {
    res.status(200).json(await roomsService.joinRoom(params.data.roomId, body.data, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/:roomId/leave', async (req, res, next) => {
  const parsed = roomIdSchema.safeParse(req.params);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid room id'));
  try {
    await roomsService.leaveRoom(parsed.data.roomId, req.session.userId!);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

roomsRouter.patch('/:roomId/readiness', async (req, res, next) => {
  const params = roomIdSchema.safeParse(req.params);
  const body = readinessSchema.safeParse(req.body);
  if (!params.success || !body.success) return next(validationError('Invalid readiness request'));
  try {
    res.status(200).json(await roomsService.setReadiness(params.data.roomId, body.data, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/:roomId/invitations', async (req, res, next) => {
  const params = roomIdSchema.safeParse(req.params);
  const body = invitationSchema.safeParse(req.body);
  if (!params.success || !body.success) return next(validationError('Invalid invitation request'));
  try {
    res.status(201).json(await roomsService.createInvitation(params.data.roomId, body.data, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.post('/:roomId/start', async (req, res, next) => {
  const parsed = roomIdSchema.safeParse(req.params);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid room id'));
  try {
    res.status(200).json(await roomsService.startRoom(parsed.data.roomId, req.session.userId!));
  } catch (error) {
    next(error);
  }
});

roomsRouter.delete('/:roomId', async (req, res, next) => {
  const parsed = roomIdSchema.safeParse(req.params);
  if (!parsed.success) return next(validationError(parsed.error.issues[0]?.message ?? 'Invalid room id'));
  try {
    await roomsService.closeRoom(parsed.data.roomId, req.session.userId!);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});
