import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { prisma } from '../../src/db/prisma/client.js';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

describe('Poker room creation races', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('creates at most one active room when the same user races requests', async () => {
    const registered = await request(app).post('/api/auth/register').send({ email: 'create-race@example.com', username: 'CreateRace', password: 'correcthorse' });
    const agent = request.agent(app);
    await agent.post('/api/auth/login').send({ email: 'create-race@example.com', password: 'correcthorse' });
    const input = { name: 'Race Room', visibility: 'PUBLIC', seatLimit: 6, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 };

    const results = await Promise.all([agent.post('/api/rooms').send(input), agent.post('/api/rooms').send({ ...input, name: 'Race Room 2' })]);

    expect(results.filter((result) => result.status === 201)).toHaveLength(1);
    expect(results.filter((result) => result.status === 409)).toHaveLength(1);
    expect(await prisma.roomMember.count({ where: { userId: registered.body.id } })).toBe(1);
  });
});
