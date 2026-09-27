export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'ACCOUNT_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'USERNAME_TAKEN'
  | 'USER_NOT_FOUND'
  | 'REQUEST_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FRIEND_REQUEST_CONFLICT'
  | 'HAND_IN_PROGRESS'
  | 'ILLEGAL_ACTION'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'ROOM_STARTED'
  | 'ROOM_CLOSED'
  | 'NOT_ROOM_HOST'
  | 'NOT_ROOM_MEMBER'
  | 'ACTIVE_ROOM_EXISTS'
  | 'ALREADY_ROOM_MEMBER'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXISTS'
  | 'NOT_INVITATION_RECIPIENT'
  | 'MUST_BE_FRIEND'
  | 'NOT_ENOUGH_PLAYERS'
  | 'MEMBERS_NOT_READY'
  | 'ROOM_ACCESS_DENIED'
  | 'TABLE_NOT_FOUND'
  | 'TABLE_CLOSED'
  | 'HAND_NOT_FOUND'
  | 'STALE_GAME_STATE'
  | 'NOT_YOUR_TURN'
  | 'DUPLICATE_ACTION'
  | 'TRAINING_SESSION_NOT_FOUND'
  | 'TRAINING_ACCESS_DENIED'
  | 'SCENARIO_NOT_FOUND'
  | 'ILLEGAL_TRAINING_ACTION'
  | 'DUPLICATE_TRAINING_DECISION'
  | 'STRATEGY_UNAVAILABLE'
  | 'RECONNECT_REQUIRED'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;

  constructor(status: number, code: ErrorCode, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// Shape mandated by contracts/auth-api.md: { error: { code, message } }.
export function errorBody(code: ErrorCode, message: string) {
  return { error: { code, message } };
}
