import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';

const app = buildTestApp();

async function registerAndLogin(email: string, username: string) {
  const registered = await request(app).post('/api/auth/register').send({ email, username, password: 'correcthorse' });
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send({ email, password: 'correcthorse' });
  return { agent, id: registered.body.id as string };
}

const roomInput = { name: 'Joinable Table', visibility: 'PUBLIC', seatLimit: 2, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 };

describe('Poker room discovery and joining', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('lists public waiting rooms and assigns the lowest open seat', async () => {
    const host = await registerAndLogin('join-host@example.com', 'JoinHost');
    const guest = await registerAndLogin('join-guest@example.com', 'JoinGuest');
    const created = await host.agent.post('/api/rooms').send(roomInput);

    const listed = await guest.agent.get('/api/rooms');
    expect(listed.status).toBe(200);
    expect(listed.body.rooms[0]).toMatchObject({ id: created.body.id, occupiedSeats: 1, availableSeats: 1 });

    const joined = await guest.agent.post(`/api/rooms/${created.body.id}/join`).send({});
    expect(joined.status).toBe(200);
    expect(joined.body.members).toContainEqual(expect.objectContaining({ userId: guest.id, seatNumber: 2 }));
  });

  it('rejects a second user when the room is full', async () => {
    const host = await registerAndLogin('full-host@example.com', 'FullHost');
    const guest = await registerAndLogin('full-guest@example.com', 'FullGuest');
    const third = await registerAndLogin('full-third@example.com', 'FullThird');
    const created = await host.agent.post('/api/rooms').send(roomInput);
    await guest.agent.post(`/api/rooms/${created.body.id}/join`).send({});

    const response = await third.agent.post(`/api/rooms/${created.body.id}/join`).send({});
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ROOM_FULL');
  });

  it('does not disclose a private room to an unauthorized user', async () => {
    const host = await registerAndLogin('private-host@example.com', 'PrivateHost');
    const stranger = await registerAndLogin('private-stranger@example.com', 'PrivateStranger');
    const created = await host.agent.post('/api/rooms').send({ ...roomInput, name: 'Private Table', visibility: 'PRIVATE' });

    const response = await stranger.agent.get(`/api/rooms/${created.body.id}`);
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe('ROOM_NOT_FOUND');
  });
});
