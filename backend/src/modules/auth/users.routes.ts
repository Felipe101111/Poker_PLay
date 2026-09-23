import { Router } from 'express';
import { requireAuth } from './auth.middleware.js';
import { usersService } from './users.service.js';
import { updateProfileSchema } from './auth.validation.js';
import { ApiError } from '../../shared/errors.js';

export const usersRouter = Router();

function toPublicUser(user: { id: string; email: string; username: string; createdAt: Date }) {
  return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt };
}

usersRouter.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await usersService.getProfile(req.session.userId!);
    res.status(200).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

// FR-011: id/email/createdAt in the body are silently ignored — only `username` is applied.
usersRouter.patch('/me', requireAuth, async (req, res, next) => {
  const parsed = updateProfileSchema.safeParse({ username: req.body?.username });
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }

  try {
    const user = await usersService.updateUsername(req.session.userId!, parsed.data);
    res.status(200).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});
