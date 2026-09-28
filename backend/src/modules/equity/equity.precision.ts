import { ApiError } from '../../shared/errors.js';

export function assertPrecision(precision: number): void {
  if (!Number.isFinite(precision) || precision <= 0 || precision > 1) throw new ApiError(400, 'INVALID_CARD_STATE', 'Precision must be greater than 0 and at most 1');
}

export function roundToPrecision(value: number, precision: number): number {
  return Math.round(value / precision) * precision;
}
