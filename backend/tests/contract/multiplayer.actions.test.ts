import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';
import { prisma } from '../../src/db/prisma/client.js';

const app = buildTestApp();

describe('multiplayer table actions', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('accepts the first action at state version zero and is idempotent by request id', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'action-contract');
    const initial = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const input = {
      handId: initial.body.table.currentHand.id,
      expectedVersion: initial.body.table.stateVersion,
      requestId: 'first-action-request',
      type: 'fold'
    };

    expect(input.expectedVersion).toBeGreaterThan(0);
    const accepted = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send(input);
    const duplicate = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send(input);

    expect(accepted.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(duplicate.body.table.stateVersion).toBe(accepted.body.table.stateVersion);
    const persisted = await prisma.multiplayerTable.findUnique({ where: { roomId: fixture.roomId }, include: { currentHand: true } });
    expect(persisted?.currentHand?.stateVersion).toBe(persisted?.stateVersion);
  });
});
