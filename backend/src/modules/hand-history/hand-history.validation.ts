import { z } from 'zod';
import type { HandHistoryQuery } from './hand-history.types.js';

const dateValue = z.string().datetime({ offset: true }).transform((value) => new Date(value));

export const handHistoryQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  from: dateValue.optional(),
  to: dateValue.optional(),
  format: z.string().trim().min(1).max(80).optional(),
  result: z.enum(['COMPLETED', 'FOLDED', 'ALL_IN', 'ABANDONED', 'ANONYMIZED']).optional(),
  participant: z.string().trim().min(1).max(120).optional(),
  sort: z.literal('endedAt').default('endedAt'),
  direction: z.enum(['asc', 'desc']).default('desc')
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'from cannot be after to' });
  }
});

export function parseHandHistoryQuery(input: unknown): HandHistoryQuery {
  return handHistoryQuerySchema.parse(input);
}

export const analyticsQuerySchema = z.object({
  from: dateValue.optional(),
  to: dateValue.optional(),
  format: z.string().trim().min(1).max(80).optional(),
  relatedLimit: z.coerce.number().int().min(1).max(50).default(20)
}).superRefine((value, context) => {
  if (value.from && value.to && value.from > value.to) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['from'], message: 'from cannot be after to' });
  }
});

export function parseAnalyticsQuery(input: unknown) {
  return analyticsQuerySchema.parse(input);
}