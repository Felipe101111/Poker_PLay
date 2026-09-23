import { Router } from 'express';
import { registerSchema, loginSchema } from './auth.validation.js';
import { authService } from './auth.service.js';
import { ApiError } from '../../shared/errors.js';

export const authRouter = Router();

function toPublicUser(user: { id: string; email: string; username: string; createdAt: Date }) {
  // Never include passwordHash (Constitution P4/P5) — only these fields ever leave the server.
  return { id: user.id, email: user.email, username: user.username, createdAt: user.createdAt };
}

authRouter.post('/register', async (req, res, next) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }

  try {
    const user = await authService.register(parsed.data);
    res.status(201).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/login', async (req, res, next) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }

  try {
    const user = await authService.login(parsed.data, req);
    res.status(200).json(toPublicUser(user));
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req, res, next) => {
  try {
    await authService.logout(req);
    res.clearCookie('sid');
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
