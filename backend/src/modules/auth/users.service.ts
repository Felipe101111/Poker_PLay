import { ApiError } from '../../shared/errors.js';
import { usersRepository } from './users.repository.js';
import type { UpdateProfileInput } from './auth.validation.js';

export const usersService = {
  // FR-010: return the authenticated user's own profile.
  async getProfile(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) {
      throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication required');
    }
    return user;
  },

  // FR-011: username doubles as the display name; same normalization/uniqueness rule as FR-003.
  async updateUsername(userId: string, input: UpdateProfileInput) {
    const existing = await usersRepository.findByNormalizedUsername(input.username);
    if (existing && existing.id !== userId) {
      throw new ApiError(409, 'USERNAME_TAKEN', 'That username is already taken');
    }
    return usersRepository.updateUsername(userId, input.username);
  }
};
