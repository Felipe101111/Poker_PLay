import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';
import { prisma } from '../../src/db/prisma/client.js';

const app = buildTestApp();

describe('multiplayer action concurrency', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('commits at most one transition for concurrent requests on one turn', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'concurrency');
    const initial = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const input = {
      handId: initial.body.table.currentHand.id,
      expectedVersion: initial.body.table.stateVersion,
      requestId: 'concurrent-fold',
      type: 'fold'
    };

    const responses = await Promise.all([
      fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send(input),
      fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send(input)
    ]);
    const hand = await prisma.multiplayerHand.findFirst({ where: { table: { roomId: fixture.roomId } }, orderBy: { handNumber: 'asc' } });
    const actions = hand ? await prisma.tableAction.count({ where: { handId: hand.id, accepted: true } }) : 0;

    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(actions).toBe(1);
  });
});