import type { HandReplay } from '../services/handHistoryApi';

export type ReplayNavigationState = { position: number; isPlaying: boolean };

export function initialReplayNavigation(): ReplayNavigationState {
  return { position: 0, isPlaying: false };
}

export function nextReplayPosition(state: ReplayNavigationState, replay: HandReplay): ReplayNavigationState {
  return { ...state, position: Math.min(state.position + 1, replay.events.length), isPlaying: state.position + 1 >= replay.events.length ? false : state.isPlaying };
}

export function previousReplayPosition(state: ReplayNavigationState): ReplayNavigationState {
  return { ...state, position: Math.max(0, state.position - 1), isPlaying: false };
}

export function selectReplayPosition(state: ReplayNavigationState, replay: HandReplay, eventIndex: number): ReplayNavigationState {
  return { ...state, position: Math.max(0, Math.min(eventIndex + 1, replay.events.length)), isPlaying: false };
}

export function toggleReplayPlaying(state: ReplayNavigationState, replay: HandReplay): ReplayNavigationState {
  return { ...state, isPlaying: state.position < replay.events.length ? !state.isPlaying : false };
}
