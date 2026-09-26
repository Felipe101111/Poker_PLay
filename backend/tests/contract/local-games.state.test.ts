import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import { buildTestApp, resetDatabase, disconnectDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return agent;
}

describe('GET /api/local-games/current', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it('reveals only the requested seat\'s own hole cards before showdown', async () => {
    const agent = await registerAndLogin('a@example.com', 'PokerState');
    await agent.post('/api/local-games').send({ seatCount: 3 });

    const asSeat1 = await agent.get('/api/local-games/current?asSeat=1');
    const asSeat2 = await agent.get('/api/local-games/current?asSeat=2');

    expect(asSeat1.status).toBe(200);
    const seat1FromSeat1 = asSeat1.body.seats.find((s: { seatNumber: number }) => s.seatNumber === 1);
    const seat2FromSeat1 = asSeat1.body.seats.find((s: { seatNumber: number }) => s.seatNumber === 2);
    expect(seat1FromSeat1.holeCards).not.toBeNull();
    expect(seat2FromSeat1.holeCards).toBeNull();

    const seat2FromSeat2 = asSeat2.body.seats.find((s: { seatNumber: number }) => s.seatNumber === 2);
    expect(seat2FromSeat2.holeCards).not.toBeNull();
  });

  it('returns 404 when the user has no active hand', async () => {
    const agent = await registerAndLogin('b@example.com', 'PokerNoHand');

    const res = await agent.get('/api/local-games/current?asSeat=1');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('HAND_NOT_FOUND');
  });
});
