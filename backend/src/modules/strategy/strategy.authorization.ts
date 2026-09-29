import type { EditorialRole } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { prisma } from '../../db/prisma/client.js';
import { ApiError } from '../../shared/errors.js';
import { editorialRoleCapabilities } from './strategy.admin.types.js';

export type EditorialCapability =
  | 'dataset:create'
  | 'draft:read'
  | 'draft:write'
  | 'draft:validate'
  | 'version:publish'
  | 'version:retire'
  | 'history:read'
  | 'audit:read'
  | 'role:write';

export function requireEditorialCapability(capability: EditorialCapability) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.session.userId) {
        next(new ApiError(401, 'UNAUTHENTICATED', 'Authentication required'));
        return;
      }
      const user = await prisma.user.findUnique({ where: { id: req.session.userId }, select: { editorialRole: true } });
      if (!user || !(editorialRoleCapabilities[user.editorialRole] as readonly string[]).includes(capability)) {
        next(new ApiError(403, 'FORBIDDEN', 'Editorial permission required'));
        return;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}

export function canEditorialRole(role: EditorialRole, capability: EditorialCapability): boolean {
  return (editorialRoleCapabilities[role] as readonly string[]).includes(capability);
}
