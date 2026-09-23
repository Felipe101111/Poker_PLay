import { prisma } from '../../db/prisma/client.js';
import { normalizeIdentifier } from './normalize.js';

export interface CreateUserInput {
  email: string;
  username: string;
  passwordHash: string;
}

export const usersRepository = {
  async findByNormalizedEmail(email: string) {
    return prisma.user.findUnique({ where: { email: normalizeIdentifier(email) } });
  },

  async findByNormalizedUsername(username: string) {
    return prisma.user.findUnique({
      where: { usernameNormalized: normalizeIdentifier(username) }
    });
  },

  async create(input: CreateUserInput) {
    return prisma.user.create({
      data: {
        email: normalizeIdentifier(input.email),
        username: input.username.trim(),
        usernameNormalized: normalizeIdentifier(input.username),
        passwordHash: input.passwordHash
      }
    });
  },

  async updateUsername(userId: string, newUsername: string) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        username: newUsername.trim(),
        usernameNormalized: normalizeIdentifier(newUsername)
      }
    });
  },

  async findById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  }
};
