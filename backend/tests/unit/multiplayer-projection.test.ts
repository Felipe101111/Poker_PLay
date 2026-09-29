import { describe, expect, it } from 'vitest';
import { startHand } from '../../src/poker-engine/engine.js';
import { projectTable } from '../../src/modules/multiplayer/multiplayer.projection.js';

function tableFixture() {
  const hand = startHand('host', 2, 100, 42);
  return {
    id: 'table-1', roomId: 'room-1', status: 'ACTIVE', handNumber: 1, stateVersion: 1, dealerSeat: 1,
    room: { members: [] },
    participants: [
      { id: 'participant-1', userId: 'host', roomMemberId: 'member-1', seatNumber: 1, stack: 99, eligibleForNextHand: true, connectionStatus: 'ONLINE', lastSeenAt: new Date(), disconnectedAt: null, eliminatedAt: null, tableId: 'table-1', user: { id: 'host', username: 'Host' } },
      { id: 'participant-2', userId: 'guest', roomMemberId: 'member-2', seatNumber: 2, stack: 98, eligibleForNextHand: true, connectionStatus: 'ONLINE', lastSeenAt: new Date(), disconnectedAt: null, eliminatedAt: null, tableId: 'table-1', user: { id: 'guest', username: 'Guest' } }
    ],
    currentHand: { id: 'hand-1', tableId: 'table-1', handNumber: 1, status: 'ACTIVE', stateSnapshot: hand, stateVersion: 1, actingSeat: hand.seatToAct, startedAt: new Date(), completedAt: null, resultSnapshot: null }
  } as never;
}

describe('multiplayer table projection', () => {
  it('only exposes the viewer cards and never raw engine persistence fields', () => {
    const projected = projectTable(tableFixture(), 'host');
    expect(projected.currentHand?.privateCards).toHaveLength(2);
    expect(projected.currentHand?.players.find((player) => player.userId === 'host')?.holeCards).toHaveLength(2);
    expect(projected.currentHand?.players.find((player) => player.userId === 'guest')?.holeCards).toBeNull();
    expect(JSON.stringify(projected)).not.toContain('deck');
    expect(JSON.stringify(projected)).not.toContain('stateSnapshot');
  });

  it('does not expose legal actions to a non-acting participant', () => {
    const projected = projectTable(tableFixture(), 'guest');
    expect(projected.currentHand?.legalActions).toBeNull();
  });
});
