import { ApiError } from '../../shared/errors.js';
import { friendsRepository } from './friends.repository.js';
import type { SearchInput, SendRequestInput } from './friends.validation.js';
import { isUserOnline } from '../auth/session-presence.js';

const PRISMA_UNIQUE_CONSTRAINT_CODE = 'P2002';

function isPrismaUniqueConstraintError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === PRISMA_UNIQUE_CONSTRAINT_CODE
  );
}

export const friendsService = {
  // FR-001/FR-002: username-only search, never exposes email/passwordHash.
  async search(input: SearchInput, callerId: string) {
    return friendsRepository.searchUsersByUsername(input.query, callerId);
  },

  // FR-003-FR-006: create a request, resolving self/duplicate/already-friends/mutual-race cases.
  async sendRequest(input: SendRequestInput, callerId: string) {
    if (input.receiverId === callerId) {
      throw new ApiError(400, 'VALIDATION_ERROR', 'You cannot send a friend request to yourself');
    }

    const receiver = await friendsRepository.findUserById(input.receiverId);
    if (!receiver) {
      throw new ApiError(404, 'USER_NOT_FOUND', 'No such user');
    }

    const existing = await friendsRepository.findByPair(callerId, input.receiverId);
    if (existing) {
      return resolveExistingPair(existing, callerId, input.receiverId);
    }

    try {
      const created = await friendsRepository.create(callerId, input.receiverId);
      return { id: created.id, receiverId: created.receiverId, status: created.status, createdAt: created.createdAt };
    } catch (err) {
      // Race safety net (Constitution P24): another request for this pair was created
      // concurrently between the findByPair check above and this insert.
      if (isPrismaUniqueConstraintError(err)) {
        const raceRow = await friendsRepository.findByPair(callerId, input.receiverId);
        if (raceRow) {
          return resolveExistingPair(raceRow, callerId, input.receiverId);
        }
      }
      throw err;
    }
  },

  async listRequests(callerId: string) {
    const [incoming, outgoing] = await Promise.all([
      friendsRepository.listIncoming(callerId),
      friendsRepository.listOutgoing(callerId)
    ]);
    return {
      incoming: incoming.map((r) => ({
        id: r.id,
        senderId: r.senderId,
        senderUsername: r.sender.username,
        createdAt: r.createdAt
      })),
      outgoing: outgoing.map((r) => ({
        id: r.id,
        receiverId: r.receiverId,
        receiverUsername: r.receiver.username,
        createdAt: r.createdAt
      }))
    };
  },

  // FR-007: only the receiver may accept/reject.
  async accept(requestId: string, callerId: string) {
    const req = await friendsRepository.findPendingById(requestId);
    if (!req) {
      throw new ApiError(404, 'REQUEST_NOT_FOUND', 'No such pending request');
    }
    if (req.receiverId !== callerId) {
      throw new ApiError(403, 'UNAUTHORIZED', 'Only the receiver can accept this request');
    }
    const updated = await friendsRepository.accept(req.id);
    return { id: updated.id, status: updated.status };
  },

  // FR-008/FR-009: reject deletes the row (no persisted REJECTED history, per data-model.md).
  async reject(requestId: string, callerId: string) {
    const req = await friendsRepository.findPendingById(requestId);
    if (!req) {
      throw new ApiError(404, 'REQUEST_NOT_FOUND', 'No such pending request');
    }
    if (req.receiverId !== callerId) {
      throw new ApiError(403, 'UNAUTHORIZED', 'Only the receiver can reject this request');
    }
    await friendsRepository.deleteById(req.id);
    return { id: req.id, status: 'REJECTED' as const };
  },

  // FR-010: only the sender may cancel a still-pending request.
  async cancelRequest(requestId: string, callerId: string) {
    const req = await friendsRepository.findPendingById(requestId);
    if (!req) {
      throw new ApiError(404, 'REQUEST_NOT_FOUND', 'No such pending request');
    }
    if (req.senderId !== callerId) {
      throw new ApiError(403, 'UNAUTHORIZED', 'Only the sender can cancel this request');
    }
    await friendsRepository.deleteById(req.id);
  },

  // FR-012/FR-013: friends list with a point-in-time online indicator.
  async listFriends(callerId: string) {
    const friends = await friendsRepository.listFriends(callerId);
    return Promise.all(
      friends.map(async (f) => ({ id: f.id, username: f.username, online: await isUserOnline(f.id) }))
    );
  },

  // FR-011: either member may remove the friendship unilaterally; idempotent if not friends.
  async removeFriend(otherUserId: string, callerId: string) {
    const row = await friendsRepository.findAcceptedByPair(callerId, otherUserId);
    if (row) {
      await friendsRepository.deleteById(row.id);
    }
  }
};

function resolveExistingPair(
  existing: { id: string; senderId: string; receiverId: string; status: string },
  callerId: string,
  otherUserId: string
) {
  // FR-006: the other side already sent a pending request to the caller — treat this
  // call as an implicit acceptance instead of erroring, resolving the race deterministically.
  const isReversePending = existing.status === 'PENDING' && existing.senderId === otherUserId;
  if (isReversePending) {
    return friendsRepository.accept(existing.id).then((updated) => ({
      id: updated.id,
      receiverId: updated.receiverId,
      status: updated.status,
      createdAt: updated.createdAt
    }));
  }
  // Same-direction PENDING, or already ACCEPTED — a genuine conflict (FR-005).
  throw new ApiError(409, 'FRIEND_REQUEST_CONFLICT', 'A request or friendship already exists between these users');
}
