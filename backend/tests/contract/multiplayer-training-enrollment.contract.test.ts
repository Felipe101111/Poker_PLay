import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { buildTestApp, disconnectDatabase, resetDatabase } from '../helpers/testApp.js';
import { createStartedMultiplayerRoom, registerAndLoginMultiplayerUser } from '../helpers/multiplayer.js';

const app = buildTestApp();

describe('multiplayer training enrollment contract', () => {
  beforeEach(() => resetDatabase());
  afterAll(() => disconnectDatabase());

  it('creates one overlay and returns only the caller participant', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'training-enrollment');
    const first = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/training`).send({ mode: 'CREATE_OR_JOIN' });
    const second = await fixture.guest.agent.post(`/api/rooms/${fixture.roomId}/training`).send({ mode: 'CREATE_OR_JOIN' });

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(first.body.training.id).toBe(second.body.training.id);
    expect(first.body.training.participant.userId).toBe(fixture.host.id);
    expect(second.body.training.participant.userId).toBe(fixture.guest.id);
    expect(first.body.training.decisions).toEqual([]);
  });

  it('is idempotent and leaving training does not leave the poker table', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'training-leave');
    const first = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/training`).send({ mode: 'CREATE_OR_JOIN' });
    const repeated = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/training`).send({ mode: 'CREATE_OR_JOIN' });
    const left = await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/training/leave`).send({});
    const table = await fixture.host.agent.get(`/api/rooms/${fixture.roomId}/table`);

    expect(repeated.body.training.id).toBe(first.body.training.id);
    expect(left.status).toBe(200);
    expect(left.body.training.participantStatus).toBe('LEFT');
    expect(table.status).toBe(200);
    expect(table.body.table.status).toBe('ACTIVE');
  });

  it('does not expose training existence to an outsider', async () => {
    const fixture = await createStartedMultiplayerRoom(app, 'training-private');
    await fixture.host.agent.post(`/api/rooms/${fixture.roomId}/training`).send({ mode: 'CREATE_OR_JOIN' });
    const outsider = await registerAndLoginMultiplayerUser(app, 'training-outsider');
    const response = await outsider.agent.get(`/api/rooms/${fixture.roomId}/training`);

    expect([404, 403]).toContain(response.status);
    expect(['TRAINING_NOT_FOUND', 'TRAINING_ACCESS_DENIED', 'ROOM_ACCESS_DENIED']).toContain(response.body.error.code);
  });
});
