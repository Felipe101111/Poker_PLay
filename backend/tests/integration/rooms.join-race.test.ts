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

describe('Poker room seat races', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('assigns the final seat to only one concurrent joiner', async () => {
    const host = await registerAndLogin('race-host@example.com', 'RaceHost');
    const first = await registerAndLogin('race-first@example.com', 'RaceFirst');
    const second = await registerAndLogin('race-second@example.com', 'RaceSecond');
    const room = await host.agent.post('/api/rooms').send({ name: 'Race Table', visibility: 'PUBLIC', seatLimit: 2, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 });

    const results = await Promise.all([
      first.agent.post(`/api/rooms/${room.body.id}/join`).send({}),
      second.agent.post(`/api/rooms/${room.body.id}/join`).send({})
    ]);

    expect(results.filter((result) => result.status === 200)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(1);
    expect(await prisma.roomMember.count({ where: { roomId: room.body.id } })).toBe(2);
  });
});
