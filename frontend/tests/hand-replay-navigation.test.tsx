import { describe, expect, it } from 'vitest';
import { initialReplayNavigation, nextReplayPosition, previousReplayPosition, selectReplayPosition, toggleReplayPlaying } from '../src/pages/handReplayState';
import type { HandReplay } from '../src/services/handHistoryApi';

const replay = { events: [{ sequence: 1 }, { sequence: 2 }] } as HandReplay;

describe('hand replay navigation', () => {
  it('clamps previous and next positions and stops at the terminal event', () => {
    const initial = initialReplayNavigation();
    expect(previousReplayPosition(initial).position).toBe(0);
    expect(nextReplayPosition(initial, replay).position).toBe(1);
    const terminal = nextReplayPosition({ position: 1, isPlaying: true }, replay);
    expect(terminal).toMatchObject({ position: 2, isPlaying: false });
    expect(nextReplayPosition(terminal, replay).position).toBe(2);
  });

  it('selects events and toggles playback only before the end', () => {
    const initial = initialReplayNavigation();
    expect(selectReplayPosition(initial, replay, 1).position).toBe(2);
    expect(toggleReplayPlaying(initial, replay).isPlaying).toBe(true);
    expect(toggleReplayPlaying({ position: 2, isPlaying: false }, replay).isPlaying).toBe(false);
  });
});
