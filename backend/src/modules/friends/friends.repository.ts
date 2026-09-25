import { prisma } from '../../db/prisma/client.js';
import { normalizePair } from './normalize-pair.js';

export const friendsRepository = {
  async searchUsersByUsername(query: string, excludeUserId: string) {
    return prisma.user.findMany({
      where: {
        id: { not: excludeUserId },
        username: { contains: query, mode: 'insensitive' }
      },
      select: { id: true, username: true },
      take: 20
    });
  },

  async findUserById(userId: string) {
    return prisma.user.findUnique({ where: { id: userId } });
  },

  // FR-005/FR-006: at most one row per unordered pair, enforced by the DB unique constraint.
  async findByPair(userIdA: string, userIdB: string) {
    const { userLowId, userHighId } = normalizePair(userIdA, userIdB);
    return prisma.friendRequest.findUnique({ where: { userLowId_userHighId: { userLowId, userHighId } } });
  },

  async create(senderId: string, receiverId: string) {
    const { userLowId, userHighId } = normalizePair(senderId, receiverId);
    return prisma.friendRequest.create({
      data: { senderId, receiverId, userLowId, userHighId, status: 'PENDING' }
    });
  },

  async accept(id: string) {
    return prisma.friendRequest.update({ where: { id }, data: { status: 'ACCEPTED' } });
  },

  async deleteById(id: string) {
    return prisma.friendRequest.delete({ where: { id } });
  },

  async findPendingById(id: string) {
    return prisma.friendRequest.findFirst({ where: { id, status: 'PENDING' } });
  },

  async listIncoming(userId: string) {
    return prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'PENDING' },
      include: { sender: { select: { username: true } } }
    });
  },

  async listOutgoing(userId: string) {
    return prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'PENDING' },
      include: { receiver: { select: { username: true } } }
    });
  },

  async listFriends(userId: string) {
    const rows = await prisma.friendRequest.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userLowId: userId }, { userHighId: userId }]
      },
      include: {
        userLow: { select: { id: true, username: true } },
        userHigh: { select: { id: true, username: true } }
      }
    });
    return rows.map((row) => (row.userLowId === userId ? row.userHigh : row.userLow));
  },

  async findAcceptedByPair(userIdA: string, userIdB: string) {
    const { userLowId, userHighId } = normalizePair(userIdA, userIdB);
    return prisma.friendRequest.findFirst({
      where: { userLowId, userHighId, status: 'ACCEPTED' }
    });
  }
};
