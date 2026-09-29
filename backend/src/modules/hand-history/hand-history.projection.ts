import type { HandHistoryQuery } from './hand-history.types.js';

type ParticipantRecord = { seatNumber: number; userId: string | null; displayNameSnapshot: string | null; visibility: string };
type ActionRecord = { sequence: number; street: string; seatNumber: number | null; actionType: string; amount: number | null; publicStateAfter: unknown };

export function projectSummary(record: { id: string; sourceType: string; format: string; status: string; startedAt: Date; endedAt: Date; publicSnapshot: unknown; participants: ParticipantRecord[] }) {
  const snapshot = asObject(record.publicSnapshot);
  return {
    id: record.id,
    sourceType: record.sourceType,
    format: record.format,
    status: record.status,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt.toISOString(),
    summary: {
      board: arrayValue(snapshot.board),
      pot: numberValue(snapshot.pot),
      result: stringValue(snapshot.result),
      participantCount: record.participants.length
    }
  };
}

export function projectDetail(record: { id: string; sourceType: string; format: string; status: string; startedAt: Date; endedAt: Date; publicSnapshot: unknown; participants: ParticipantRecord[]; actions: ActionRecord[] }, userId: string) {
  const snapshot = asObject(record.publicSnapshot);
  return {
    id: record.id,
    sourceType: record.sourceType,
    format: record.format,
    status: record.status,
    startedAt: record.startedAt.toISOString(),
    endedAt: record.endedAt.toISOString(),
    board: arrayValue(snapshot.board),
    participants: record.participants.map((participant) => ({
      seatNumber: participant.seatNumber,
      displayName: participant.userId === userId ? participant.displayNameSnapshot ?? 'You' : participant.visibility === 'ANONYMIZED' ? 'Anonymous player' : participant.displayNameSnapshot ?? 'Player',
      isViewer: participant.userId === userId
    })),
    actions: record.actions.sort((left, right) => left.sequence - right.sequence).map((action) => ({
      sequence: action.sequence,
      street: action.street,
      seatNumber: action.seatNumber,
      type: action.actionType.toLowerCase(),
      amount: action.amount
    })),
    pots: arrayValue(snapshot.pots),
    revealedCards: arrayValue(snapshot.revealedCards),
    limitations: arrayValue(snapshot.limitations)
  };
}

function asObject(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function arrayValue(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function numberValue(value: unknown): number | null { return typeof value === 'number' ? value : null; }
function stringValue(value: unknown): string | null { return typeof value === 'string' ? value : null; }

export function queryFilters(query: HandHistoryQuery, userId: string) {
  const where: Record<string, unknown> = { policies: { some: { userId, canList: true } } };
  if (query.from || query.to) where.endedAt = { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) };
  if (query.format) where.format = query.format;
  if (query.result) where.status = query.result;
  if (query.participant) where.participants = { some: { displayNameSnapshot: { contains: query.participant, mode: 'insensitive' } } };
  return where;
}