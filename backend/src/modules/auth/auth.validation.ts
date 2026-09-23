import { z } from 'zod';

// FR-002 (well-formed email), FR-004 (min 8 chars, no forced composition rules).
export const registerSchema = z.object({
  email: z.string().trim().email('Email must be a valid email address'),
  username: z.string().trim().min(1, 'Username is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long')
});

export type RegisterInput = z.infer<typeof registerSchema>;

// Login validation (FR-013/FR-017): both fields required strings; the actual
// credential check happens in AuthService, never trusting client-side checks.
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

// FR-011: only the username is editable via profile updates.
export const updateProfileSchema = z.object({
  username: z.string().trim().min(1, 'Username is required')
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
