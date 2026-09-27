import { describe, expect, it } from 'vitest';
import {
  DISCONNECT_GRACE_MS,
  isGraceExpired,
  shouldAutoFoldDisconnectedActingSeat
} from '../../src/modules/multiplayer/multiplayer.presence.js';

describe('multiplayer presence policy', () => {
  const now = new Date('2026-09-26T12:00:00.000Z');

  it('uses the server timestamp and a 60-second grace period', () => {
    expect(DISCONNECT_GRACE_MS).toBe(60_000);
    expect(isGraceExpired(new Date(now.getTime() - 59_999), now)).toBe(false);
    expect(isGraceExpired(new Date(now.getTime() - DISCONNECT_GRACE_MS), now)).toBe(true);
  });

  it('auto-folds only a disconnected participant who still owns the turn', () => {
    expect(shouldAutoFoldDisconnectedActingSeat({ disconnectedAt: new Date(now.getTime() - 60_000), seatNumber: 2, actingSeat: 2 }, now)).toBe(true);
    expect(shouldAutoFoldDisconnectedActingSeat({ disconnectedAt: new Date(now.getTime() - 60_000), seatNumber: 2, actingSeat: 1 }, now)).toBe(false);
    expect(shouldAutoFoldDisconnectedActingSeat({ disconnectedAt: null, seatNumber: 2, actingSeat: 2 }, now)).toBe(false);
  });
});
