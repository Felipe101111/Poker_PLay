import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';
import { prisma } from '../../src/db/prisma/client.js';

const app = buildTestApp();

describe('multiplayer reconnect coordination', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('recovers the newest snapshot without creating a duplicate seat', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'reconnect');
    const first = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const reconnectOne = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/reconnect`).send({ lastSeenVersion: 0 });
    const reconnectTwo = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/reconnect`).send({ lastSeenVersion: first.body.table.stateVersion });
    const table = await prisma.multiplayerTable.findUnique({ where: { roomId: fixture.roomId } });
    const participantCount = await prisma.tableParticipant.count({ where: { tableId: table!.id, userId: fixture.host.id } });

    expect(reconnectOne.status).toBe(200);
    expect(reconnectTwo.status).toBe(200);
    expect(reconnectTwo.body.table.stateVersion).toBeGreaterThanOrEqual(reconnectOne.body.table.stateVersion);
    expect(participantCount).toBe(1);
    expect(reconnectTwo.body.table.currentHand.privateCards).toHaveLength(2);
  });
});
