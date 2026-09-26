import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../../../src/db/prisma/client.js';
import { roomsService } from '../../../src/modules/rooms/rooms.service.js';
import { disconnectDatabase, resetDatabase } from '../../helpers/testApp.js';

describe('waiting-room presence cleanup', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('never removes members from a started room', async () => {
    const user = await prisma.user.create({ data: { email: 'presence@example.com', username: 'Presence', usernameNormalized: 'presence', passwordHash: 'hash' } });
    const room = await prisma.pokerRoom.create({ data: { hostId: user.id, name: 'Started', visibility: 'PUBLIC', status: 'STARTED', seatLimit: 2, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2, startedAt: new Date() } });
    await prisma.roomMember.create({ data: { roomId: room.id, userId: user.id, seatNumber: 1, lastSeenAt: new Date(Date.now() - 16 * 60 * 1000) } });

    expect(await roomsService.cleanupStaleWaitingMembers()).toBe(0);
    expect(await prisma.roomMember.count({ where: { roomId: room.id } })).toBe(1);
  });
});
