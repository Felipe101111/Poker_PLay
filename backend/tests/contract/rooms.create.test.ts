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

const validRoom = {
  name: '  Friday   Table ',
  visibility: 'PUBLIC',
  seatLimit: 6,
  minPlayers: 2,
  startingStackBB: 100,
  smallBlind: 1,
  bigBlind: 2
};

describe('Poker room creation', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('creates a waiting room and seats the host in seat one', async () => {
    const host = await registerAndLogin('room-host@example.com', 'RoomHost');
    const response = await host.agent.post('/api/rooms').send(validRoom);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ name: 'Friday Table', status: 'WAITING', hostId: host.id, occupiedSeats: 1 });
    expect(response.body.members).toHaveLength(1);
    expect(response.body.members[0]).toMatchObject({ userId: host.id, seatNumber: 1, isHost: true, ready: false });
  });

  it('rejects invalid settings without creating a room', async () => {
    const host = await registerAndLogin('room-invalid@example.com', 'RoomInvalid');
    const response = await host.agent.post('/api/rooms').send({ ...validRoom, name: '   ', minPlayers: 7 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect((await host.agent.get('/api/rooms')).body.rooms).toHaveLength(0);
  });

  it('allows only one active room membership per user', async () => {
    const host = await registerAndLogin('room-one@example.com', 'RoomOne');
    await host.agent.post('/api/rooms').send(validRoom);
    const response = await host.agent.post('/api/rooms').send({ ...validRoom, name: 'Second Table' });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe('ACTIVE_ROOM_EXISTS');
  });

  it('requires authentication', async () => {
    const response = await request(app).post('/api/rooms').send(validRoom);
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('UNAUTHENTICATED');
  });
});
