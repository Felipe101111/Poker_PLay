import { z } from 'zod';

// FR-001: username-only search.
export const searchSchema = z.object({
  query: z.string().trim().min(1, 'Search query is required')
});

export type SearchInput = z.infer<typeof searchSchema>;

// FR-003/FR-004: receiverId must be a UUID; self-request check happens in the service
// (needs the authenticated caller's id, which isn't available to a standalone schema).
export const sendRequestSchema = z.object({
  receiverId: z.string().uuid('receiverId must be a valid user id')
});

export type SendRequestInput = z.infer<typeof sendRequestSchema>;
