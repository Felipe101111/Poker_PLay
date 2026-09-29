import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom, registerAndLoginMultiplayerUser } from '../helpers/multiplayer.js';
import { multiplayerService } from '../../src/modules/multiplayer/multiplayer.service.js';

const app = buildTestApp();

describe('multiplayer table HTTP contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('bootstraps one active table and redacts the other player cards', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'table-contract');
    const response = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);

    expect(response.status).toBe(200);
    expect(response.body.table.status).toBe('ACTIVE');
    expect(response.body.table.currentHand.players).toHaveLength(2);
    expect(response.body.table.currentHand.privateCards).toHaveLength(2);
    expect(response.body.table.currentHand.players.find((player: { userId: string }) => player.userId === fixture.guest.id).holeCards).toBeNull();
  });

  it('rejects authenticated users who are not room members', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'table-access');
    const outsider = await registerAndLoginMultiplayerUser(app, 'table-outsider');
    const response = await outsider.agent.get(`/api/rooms/${fixture.roomId}/table`);

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe('ROOM_ACCESS_DENIED');
  });

  it('reconnects a member and returns the latest state', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'table-reconnect');
    const response = await fixture.guest.agent.post(`/api/rooms/${fixture.roomId}/table/reconnect`).send({ lastSeenVersion: 0 });

    expect(response.status).toBe(200);
    expect(response.body.table.roomId).toBe(fixture.roomId);
    expect(response.body.table.stateVersion).toBeGreaterThanOrEqual(0);
  });

  it('lets a player abandon, create another room, and leaves the other members playing', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'table-abandon', 3);
    await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);

    await multiplayerService.abandon(fixture.roomId, fixture.host.id);

    const currentRoom = await fixture.host.agent.get('/api/rooms/current');
    const newRoom = await fixture.host.agent.post('/api/rooms').send({
      name: 'Another table', visibility: 'PUBLIC', seatLimit: 2, minPlayers: 2,
      startingStackBB: 100, smallBlind: 1, bigBlind: 2
    });
    const remainingPlayerTable = await fixture.guest.agent.get(`/api/rooms/${fixture.roomId}/table`);

    expect(currentRoom.status).toBe(200);
    expect(currentRoom.body.room).toBeNull();
    expect(newRoom.status).toBe(201);
    expect(remainingPlayerTable.status).toBe(200);
    expect(remainingPlayerTable.body.table.currentHand.players.find((player: { userId: string }) => player.userId === fixture.host.id))
      .toMatchObject({ eliminated: true, folded: true, holeCards: null });
  });
});
