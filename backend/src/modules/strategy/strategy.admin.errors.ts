import { ApiError, type ErrorCode } from '../../shared/errors.js';

export const strategyAdminError = {
  forbidden: (message = 'Editorial permission required') => new ApiError(403, 'FORBIDDEN', message),
  notFound: (message = 'Editorial resource not found') => new ApiError(404, 'NOT_FOUND', message),
  invalidInput: (message = 'Invalid editorial input') => new ApiError(400, 'INVALID_INPUT', message),
  validationFailed: (message = 'Strategy validation failed') => new ApiError(422, 'VALIDATION_FAILED', message),
  draftConflict: (message = 'Draft changed; review the latest revision') => new ApiError(409, 'DRAFT_CONFLICT', message),
  invalidState: (message = 'Invalid strategy state transition') => new ApiError(409, 'INVALID_STATE_TRANSITION', message),
  activeConflict: (message = 'An active compatible version already exists') => new ApiError(409, 'ACTIVE_VERSION_CONFLICT', message),
  retireReasonRequired: (message = 'Retirement reason is required') => new ApiError(400, 'RETIRE_REASON_REQUIRED', message)
} satisfies Record<string, (message?: string) => ApiError>;

export function isStrategyAdminCode(code: ErrorCode): boolean {
  return ['FORBIDDEN', 'NOT_FOUND', 'VALIDATION_FAILED', 'DRAFT_CONFLICT', 'INVALID_STATE_TRANSITION', 'ACTIVE_VERSION_CONFLICT', 'RETIRE_REASON_REQUIRED', 'INVALID_INPUT'].includes(code);
}
