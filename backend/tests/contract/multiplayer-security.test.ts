import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';

const app = buildTestApp();

describe('multiplayer authorization and input security', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('rejects unauthenticated and malformed table requests', async () => {
    const unauthenticated = await request(app).get('/api/rooms/not-a-uuid/table');
    expect(unauthenticated.status).toBe(401);
    expect(unauthenticated.body.error.code).toBe('UNAUTHENTICATED');

    const fixture = await createStartedMultiplayerRoom(app, 'security-input');
    const malformed = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table/actions`);
    expect(malformed.status).toBe(404);
  });

  it('resolves actor identity from the session instead of forged user or seat fields', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'security-identity');
    const initial = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const response = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send({
      handId: initial.body.table.currentHand.id,
      expectedVersion: initial.body.table.stateVersion,
      requestId: 'forged-identity',
      type: 'fold',
      userId: fixture.guest.id,
      seatNumber: 2
    });

    expect(response.status).toBe(200);
    expect(response.body.table.stateVersion).toBeGreaterThan(initial.body.table.stateVersion);
  });

  it('does not expose another participant private cards through an alternate member session', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'security-cards');
    const host = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const guest = await fixture.guest.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const hostCards = host.body.table.currentHand.players.find((player: { userId: string }) => player.userId === fixture.host.id).holeCards;
    const guestCards = guest.body.table.currentHand.players.find((player: { userId: string }) => player.userId === fixture.host.id).holeCards;

    expect(hostCards).toHaveLength(2);
    expect(guestCards).toBeNull();
  });
});
