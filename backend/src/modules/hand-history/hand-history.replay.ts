import type { HistoryRedactionProfile } from '@prisma/client';
import type { HandHistoryStatus, ReplayDocument, ReplayEvent, ReplayLimitation } from './hand-history.types.js';

type ReplayRecord = {
  id: string;
  sourceType: string;
  format: string;
  status: HandHistoryStatus | string;
  sequenceVersion: number;
  publicSnapshot: unknown;
  participants: Array<{ seatNumber: number; userId: string | null; displayNameSnapshot: string | null; visibility: string }>;
  actions: Array<{ sequence: number; street: string; seatNumber: number | null; actionType: string; amount: number | null; publicStateAfter: unknown; occurredAt: Date }>;
  policies: Array<{ userId: string; redactionProfile: HistoryRedactionProfile }>;
};

const hiddenKeys = new Set(['rawdeck', 'deck', 'holecards', 'privatecards', 'opponentcards', 'enginesnapshot', 'internalstate', 'passwordhash', 'email', 'userid', 'sourceid']);

export function projectReplay(record: ReplayRecord, userId: string): ReplayDocument {
  const policy = record.policies.find((item) => item.userId === userId);
  const snapshot = asObject(record.publicSnapshot);
  const limitations = [...toLimitations(snapshot.limitations)];
  const initialCandidate = asObject(snapshot.initialState);
  const initialState = projectState(initialCandidate, record, userId);
  if (Object.keys(initialCandidate).length === 0) limitations.push(unavailable('Initial state is not available in this historical record.'));

  const sortedActions = [...record.actions].sort((left, right) => left.sequence - right.sequence);
  const events: ReplayEvent[] = sortedActions.map((action) => {
    const stateCandidate = asObject(action.publicStateAfter);
    const stateAfter = Object.keys(stateCandidate).length > 0 ? projectState(stateCandidate, record, userId) : null;
    return {
      sequence: action.sequence,
      street: action.street as ReplayEvent['street'],
      seatNumber: action.seatNumber,
      actionType: action.actionType as ReplayEvent['actionType'],
      amount: action.amount,
      occurredAt: new Date(action.occurredAt).toISOString(),
      stateAfter,
      ...(stateAfter ? {} : { limitation: unavailable('The state after this event is not available.') })
    };
  });

  const firstSequence = sortedActions[0]?.sequence;
  if (firstSequence && firstSequence > 1) limitations.push(gap(1, firstSequence - 1));
  for (let index = 1; index < sortedActions.length; index += 1) {
    const previous = sortedActions[index - 1].sequence;
    const current = sortedActions[index].sequence;
    if (current > previous + 1) limitations.push(gap(previous + 1, current - 1));
  }
  if (events.length === 0) limitations.push({ code: 'NO_VISIBLE_EVENTS', message: 'No replay events are visible for this hand.' });

  const terminalState = Object.keys(snapshot).length > 0 ? projectState(snapshot, record, userId) : null;
  const profile = policy?.redactionProfile;
  if (profile === 'ANONYMIZED') limitations.push({ code: 'ANONYMIZED_DATA', message: 'Some participant information has been anonymized.' });

  return {
    historyId: record.id,
    sourceType: record.sourceType as ReplayDocument['sourceType'],
    format: record.format,
    status: record.status as ReplayDocument['status'],
    sequenceVersion: record.sequenceVersion,
    initialState: withParticipants(initialState, record, userId),
    events,
    terminalState,
    limitations: deduplicateLimitations(limitations)
  };
}

function projectState(value: Record<string, unknown>, record: ReplayRecord, userId: string): Record<string, unknown> {
  const projected = redact(value);
  if (Array.isArray(projected.participants)) projected.participants = projectParticipants(record, userId);
  return projected;
}

function withParticipants(state: Record<string, unknown>, record: ReplayRecord, userId: string) {
  return state.participants ? state : { ...state, participants: projectParticipants(record, userId) };
}

function projectParticipants(record: ReplayRecord, userId: string) {
  return record.participants.map((participant) => ({
    seatNumber: participant.seatNumber,
    displayName: participant.userId === userId ? participant.displayNameSnapshot ?? 'You' : participant.visibility === 'ANONYMIZED' ? 'Anonymous player' : participant.displayNameSnapshot ?? 'Player',
    isViewer: participant.userId === userId
  }));
}

function redact(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([key]) => !hiddenKeys.has(key.toLowerCase())).map(([key, entry]) => [key, redactValue(entry)]));
}

function redactValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === 'object') return redact(value);
  return value;
}

function asObject(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function unavailable(message: string): ReplayLimitation { return { code: 'UNAVAILABLE_STATE', message }; }
function gap(fromSequence: number, toSequence: number): ReplayLimitation { return { code: 'LEGACY_GAP', message: 'Some historical events are unavailable.', fromSequence, toSequence }; }
function toLimitations(value: unknown): ReplayLimitation[] { return Array.isArray(value) ? value.filter((item): item is ReplayLimitation => Boolean(item && typeof item === 'object' && 'code' in item && 'message' in item)) : []; }
function deduplicateLimitations(items: ReplayLimitation[]) { return items.filter((item, index) => items.findIndex((candidate) => candidate.code === item.code && candidate.fromSequence === item.fromSequence && candidate.toSequence === item.toSequence) === index); }