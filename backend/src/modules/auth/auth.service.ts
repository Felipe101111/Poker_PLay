import argon2 from 'argon2';
import type { Request } from 'express';
import { ApiError } from '../../shared/errors.js';
import { usersRepository } from './users.repository.js';
import type { RegisterInput, LoginInput } from './auth.validation.js';

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT_CODE
  );
}

export const authService = {
  // FR-001-FR-005, FR-012: create a new account with a hashed password.
  async register(input: RegisterInput) {
    const [existingByEmail, existingByUsername] = await Promise.all([
      usersRepository.findByNormalizedEmail(input.email),
      usersRepository.findByNormalizedUsername(input.username)
    ]);

    if (existingByEmail || existingByUsername) {
      throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account with these details already exists');
    }

    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });

    try {
      return await usersRepository.create({
        email: input.email,
        username: input.username,
        passwordHash
      });
    } catch (err) {
      // Safety net against a race between the pre-check above and this insert
      // (Constitution P24: never leave inconsistent/duplicate records).
      if (isPrismaUniqueConstraintError(err)) {
        throw new ApiError(409, 'ACCOUNT_EXISTS', 'An account with these details already exists');
      }
      throw err;
    }
  },

  // FR-006-FR-008, FR-017: verify credentials and start a session.
  // Returns a single generic error for both "no such email" and "wrong password" (FR-007/SC-004).
  async login(input: LoginInput, req: Request) {
    const user = await usersRepository.findByNormalizedEmail(input.email);
    const passwordMatches = user
      ? await argon2.verify(user.passwordHash, input.password)
      : await argon2.verify(
          // Constant-time-ish decoy hash so timing doesn't reveal account existence.
          '$argon2id$v=19$m=65536,t=3,p=4$c2FsdHNhbHRzYWx0$Q9C0nGqXW3B2M8m0m0m0mw',
          input.password
        ).catch(() => false);

    if (!user || !passwordMatches) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
    }

    req.session.userId = user.id;
    req.session.createdAt = new Date().toISOString();

    return user;
  },

  // FR-009: terminate the session so the cookie can never be reused.
  logout(req: Request): Promise<void> {
    return new Promise((resolve, reject) => {
      req.session.destroy((err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }
};
