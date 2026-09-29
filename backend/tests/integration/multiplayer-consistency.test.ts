import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom } from '../helpers/multiplayer.js';

const app = buildTestApp();

describe('multiplayer projection consistency', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('recovers the newest version after a missed broadcast and never rolls back', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'consistency');
    const first = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);
    const actor = first.body.table.currentHand.actingSeat === 1 ? fixture.host : fixture.guest;
    const action = await actor.agent.post(`/api/rooms/${fixture.roomId}/table/actions`).send({
      handId: first.body.table.currentHand.id,
      expectedVersion: first.body.table.stateVersion,
      requestId: 'consistency-fold',
      type: 'fold'
    });
    const recovered = await fixture.guest.agent.post(`/api/rooms/${fixture.roomId}/table/reconnect`).send({ lastSeenVersion: 0 });
    const delayed = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/table/reconnect`).send({ lastSeenVersion: first.body.table.stateVersion });

    expect(action.status).toBe(200);
    expect(recovered.body.table.stateVersion).toBeGreaterThanOrEqual(action.body.table.stateVersion);
    expect(delayed.body.table.stateVersion).toBeGreaterThanOrEqual(first.body.table.stateVersion);
  });
});
