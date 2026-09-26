import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/db/prisma/client.js';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  const registered = await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, id: registered.body.id as string };
}

describe('Poker room invitation races', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('accepts one invitation exactly once under concurrent requests', async () => {
    const host = await registerAndLogin('accept-host@example.com', 'AcceptHost');
    const friend = await registerAndLogin('accept-friend@example.com', 'AcceptFriend');
    const requestSent = await host.agent.post('/api/friends/requests').send({ receiverId: friend.id });
    await friend.agent.post(`/api/friends/requests/${requestSent.body.id}/accept`);
    const room = await host.agent.post('/api/rooms').send({ name: 'Accept Race', visibility: 'PRIVATE', seatLimit: 3, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 });
    const invitation = await host.agent.post(`/api/rooms/${room.body.id}/invitations`).send({ userId: friend.id });

    const results = await Promise.all([
      friend.agent.post(`/api/rooms/invitations/${invitation.body.id}/accept`),
      friend.agent.post(`/api/rooms/invitations/${invitation.body.id}/accept`)
    ]);

    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status >= 400)).toHaveLength(1);
    expect(await prisma.roomMember.count({ where: { roomId: room.body.id, userId: friend.id } })).toBe(1);
  });
});
