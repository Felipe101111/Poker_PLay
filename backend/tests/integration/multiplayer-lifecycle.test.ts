import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';
import { prisma } from '../../src/db/prisma/client.js';

const app = buildTestApp();

describe('multiplayer hand lifecycle', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('creates the next hand atomically after a completed fold and keeps versions aligned', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'lifecycle-next');
    const initial = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const actingPlayer = initial.body.table.currentHand.players.find((player: { seatNumber: number }) => player.seatNumber === initial.body.table.currentHand.actingSeat);
    const actor = actingPlayer.userId === fixture.host.id ? fixture.host : fixture.guest;
    const completed = await actor.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send({
      handId: initial.body.table.currentHand.id,
      expectedVersion: initial.body.table.stateVersion,
      requestId: 'lifecycle-fold',
      type: 'fold'
    });
    const table = await prisma.multiplayerTable.findUnique({ where: { roomId: fixture.roomId }, include: { currentHand: true } });

    expect(completed.status).toBe(200);
    expect(table?.handNumber).toBe(2);
    expect(table?.currentHand?.status).toBe('ACTIVE');
    expect(table?.currentHand?.stateVersion).toBe(table?.stateVersion);
  });

  it('allows authorized reads after terminal closure while rejecting later actions', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'lifecycle-closed');
    await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const table = await prisma.multiplayerTable.findUnique({ where: { roomId: fixture.roomId }, include: { currentHand: true } });
    await prisma.multiplayerTable.update({ where: { id: table!.id }, data: { status: 'CLOSED', closedAt: new Date() } });
    const readable = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const rejected = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send({
      handId: table!.currentHand!.id,
      expectedVersion: table!.stateVersion,
      requestId: 'closed-action',
      type: 'fold'
    });

    expect(readable.status).toBe(200);
    expect(readable.body.table.status).toBe('CLOSED');
    expect(rejected.status).toBe(409);
    expect(rejected.body.error.code).toBe('TABLE_CLOSED');
  });
});