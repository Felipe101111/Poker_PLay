import { describe, expect, it } from 'vitest';
import { createRoomSchema } from '../../../src/modules/rooms/rooms.validation.js';

describe('room validation', () => {
  const base = { name: 'Table', visibility: 'PUBLIC' as const, seatLimit: 6, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2 };

  it('normalizes duplicate whitespace in names', () => {
    expect(createRoomSchema.parse({ ...base, name: '  Friday   Table ' }).name).toBe('Friday Table');
  });

  it('rejects unsafe names and invalid player settings', () => {
    expect(createRoomSchema.safeParse({ ...base, name: 'bad\nname' }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...base, minPlayers: 7 }).success).toBe(false);
    expect(createRoomSchema.safeParse({ ...base, bigBlind: 1 }).success).toBe(false);
  });
});
