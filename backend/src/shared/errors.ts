export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'ACCOUNT_EXISTS'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHENTICATED'
  | 'USERNAME_TAKEN'
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
