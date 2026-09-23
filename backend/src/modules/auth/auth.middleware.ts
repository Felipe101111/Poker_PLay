import type { Request, Response, NextFunction } from 'express';
import { ApiError } from '../../shared/errors.js';

// Rejects any request without a valid session (FR-008, FR-013).
// express-session's `rolling: true` already slides expiresAt on every request
// that reaches the session middleware; this guard just enforces the gate.
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  if (!req.session.userId) {
    next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication required'));
    return;
  }
  next();
}
