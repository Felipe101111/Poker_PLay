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

const roomInput = { name: 'Lifecycle Table', visibility: 'PUBLIC', seatLimit: 2, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 };

describe('Poker room lifecycle', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('requires enough ready members before starting', async () => {
    const host = await registerAndLogin('life-host@example.com', 'LifeHost');
    const guest = await registerAndLogin('life-guest@example.com', 'LifeGuest');
    const created = await host.agent.post('/api/rooms').send(roomInput);

    const tooFew = await host.agent.post(`/api/rooms/${created.body.id}/start`);
    expect(tooFew.status).toBe(409);
    expect(tooFew.body.error.code).toBe('NOT_ENOUGH_PLAYERS');

    await guest.agent.post(`/api/rooms/${created.body.id}/join`).send({});
    await host.agent.patch(`/api/rooms/${created.body.id}/readiness`).send({ ready: true });
    const notReady = await host.agent.post(`/api/rooms/${created.body.id}/start`);
    expect(notReady.status).toBe(409);
    expect(notReady.body.error.code).toBe('MEMBERS_NOT_READY');
  });

  it('starts only when all members are ready and then rejects joins', async () => {
    const host = await registerAndLogin('started-host@example.com', 'StartedHost');
    const guest = await registerAndLogin('started-guest@example.com', 'StartedGuest');
    const late = await registerAndLogin('started-late@example.com', 'StartedLate');
    const created = await host.agent.post('/api/rooms').send(roomInput);
    await guest.agent.post(`/api/rooms/${created.body.id}/join`).send({});
    await host.agent.patch(`/api/rooms/${created.body.id}/readiness`).send({ ready: true });
    await guest.agent.patch(`/api/rooms/${created.body.id}/readiness`).send({ ready: true });

    const started = await host.agent.post(`/api/rooms/${created.body.id}/start`);
    expect(started.status).toBe(200);
    expect(started.body.status).toBe('STARTED');
    expect((await late.agent.post(`/api/rooms/${created.body.id}/join`).send({})).body.error.code).toBe('ROOM_STARTED');
  });

  it('transfers host ownership when the host leaves', async () => {
    const host = await registerAndLogin('transfer-host@example.com', 'TransferHost');
    const guest = await registerAndLogin('transfer-guest@example.com', 'TransferGuest');
    const created = await host.agent.post('/api/rooms').send(roomInput);
    await guest.agent.post(`/api/rooms/${created.body.id}/join`).send({});

    const left = await host.agent.post(`/api/rooms/${created.body.id}/leave`);
    expect(left.status).toBe(204);
    const room = await guest.agent.get(`/api/rooms/${created.body.id}`);
    expect(room.body.hostId).toBe(guest.id);
  });
});
