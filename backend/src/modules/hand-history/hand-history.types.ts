import type { Prisma } from '@prisma/client';

export type HandHistorySourceType = 'LOCAL_GAME' | 'MULTIPLAYER' | 'TRAINER';
export type HandHistoryStatus = 'COMPLETED' | 'FOLDED' | 'ALL_IN' | 'ABANDONED' | 'ANONYMIZED';
export type HandActionStreet = 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER' | 'SHOWDOWN' | 'TERMINAL';
export type HandActionType = 'FOLD' | 'CHECK' | 'CALL' | 'BET' | 'RAISE' | 'ALL_IN' | 'BLIND' | 'DEAL' | 'SHOWDOWN' | 'TERMINAL';

export interface HandHistoryParticipantInput {
  userId?: string | null;
  seatNumber: number;
  displayName?: string | null;
  role?: 'PLAYER' | 'SPECTATOR';
  visibility?: 'PARTICIPANT' | 'AUTHORIZED_VIEWER' | 'ANONYMIZED';
}

export interface HandActionInput {
  sequence: number;
  street: HandActionStreet;
  seatNumber?: number | null;
  actionType: HandActionType;
  amount?: number | null;
  publicStateAfter?: Prisma.InputJsonValue;
  occurredAt: Date | string;
}

export interface TerminalHandSnapshot {
  sourceType: HandHistorySourceType;
  sourceId: string;
  status: Exclude<HandHistoryStatus, 'ANONYMIZED'>;
  format: string;
  startedAt: Date | string;
  endedAt: Date | string;
  sequenceVersion?: number;
  publicSnapshot: Prisma.InputJsonValue;
  participants: HandHistoryParticipantInput[];
  actions: HandActionInput[];
}

export interface HandHistoryQuery {
  page: number;
  pageSize: number;
  from?: Date;
  to?: Date;
  format?: string;
  result?: HandHistoryStatus;
  participant?: string;
  sort: 'endedAt';
  direction: 'asc' | 'desc';
}

export type ReplayLimitationCode = 'HIDDEN_PRIVATE_DATA' | 'LEGACY_GAP' | 'ANONYMIZED_DATA' | 'UNAVAILABLE_STATE' | 'NO_VISIBLE_EVENTS';

export interface ReplayLimitation {
  code: ReplayLimitationCode;
  message: string;
  fromSequence?: number | null;
  toSequence?: number | null;
}

export interface ReplayEvent {
  sequence: number;
  street: HandActionStreet;
  seatNumber: number | null;
  actionType: HandActionType;
  amount: number | null;
  occurredAt: string;
  stateAfter: Record<string, unknown> | null;
  limitation?: ReplayLimitation;
}

export interface ReplayDocument {
  historyId: string;
  sourceType: HandHistorySourceType;
  format: string;
  status: HandHistoryStatus;
  sequenceVersion: number;
  initialState: Record<string, unknown>;
  events: ReplayEvent[];
  terminalState: Record<string, unknown> | null;
  limitations: ReplayLimitation[];
}

export interface AnalyticsFilter {
  from?: Date;
  to?: Date;
  format?: string;
  relatedLimit: number;
}

export type AnalyticsLimitationCode = 'INSUFFICIENT_SAMPLE' | 'ZERO_DENOMINATOR' | 'DATA_UNAVAILABLE' | 'NO_RESULTS' | 'PRIVACY_REDACTION';

export interface AnalyticsLimitation {
  code: AnalyticsLimitationCode;
  message: string;
  metric?: string;
  position?: string;
  street?: string;
}

export interface MetricValue {
  value: number | null;
  numerator: number;
  denominator: number;
  sampleThreshold: number;
  isSufficient: boolean;
}

export interface DecisionMetrics {
  scope: 'ALL' | HandActionStreet;
  vpip: MetricValue;
  pfr: MetricValue;
  threeBet: MetricValue;
  winRate: MetricValue;
}

export interface TrendPoint {
  periodStart: string;
  periodEnd: string;
  hands: number;
  netResult: number | null;
  evResult: number | null;
}

export interface BreakdownRow {
  key: string;
  hands: number;
  metrics: DecisionMetrics;
  limitations: AnalyticsLimitation[];
}

export interface RelatedHand {
  historyId: string;
  endedAt: string;
  format: string;
  status: string;
  contribution: string[];
  canOpenDetail: boolean;
  canOpenReplay: boolean;
}

export interface AnalyticsDocument {
  filters: AnalyticsFilter & { eligibleHands: number };
  summary: {
    handsPlayed: number;
    netResult: number | null;
    evResult: number | null;
    winRate: MetricValue;
    roi: MetricValue | null;
    netResultAvailable: boolean;
    evAvailable: boolean;
  };
  trend: TrendPoint[];
  overall: DecisionMetrics;
  byPosition: BreakdownRow[];
  byStreet: BreakdownRow[];
  relatedHands: RelatedHand[];
  limitations: AnalyticsLimitation[];
}