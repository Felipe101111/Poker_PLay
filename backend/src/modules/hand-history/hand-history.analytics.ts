import type { AnalyticsLimitation, BreakdownRow, DecisionMetrics, MetricValue, TrendPoint } from './hand-history.types.js';

export const ANALYTICS_SAMPLE_THRESHOLD = 30;

type AnalyticsInput = {
  netResult?: unknown;
  evResult?: unknown;
  vpipEligible?: unknown;
  vpipSelected?: unknown;
  pfrEligible?: unknown;
  pfrSelected?: unknown;
  threeBetEligible?: unknown;
  threeBetSelected?: unknown;
  winEligible?: unknown;
  won?: unknown;
  position?: unknown;
  streetMetrics?: unknown;
};

type AnalyticsRecord = {
  id: string;
  format: string;
  status: string;
  endedAt: Date;
  publicSnapshot: unknown;
  policies: { userId: string; canViewDetail: boolean; canList: boolean }[];
};

export function analyticsInput(snapshot: unknown): AnalyticsInput | null {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return null;
  const analytics = (snapshot as Record<string, unknown>).analytics;
  if (!analytics || typeof analytics !== 'object' || Array.isArray(analytics)) return null;
  return analytics as AnalyticsInput;
}

export function metric(numerator: number, denominator: number): MetricValue {
  return { value: denominator ? numerator / denominator : null, numerator, denominator, sampleThreshold: ANALYTICS_SAMPLE_THRESHOLD, isSufficient: denominator >= ANALYTICS_SAMPLE_THRESHOLD };
}

function limitation(code: AnalyticsLimitation['code'], message: string, metricName?: string): AnalyticsLimitation {
  return metricName ? { code, message, metric: metricName } : { code, message };
}

export function metricLimitations(value: MetricValue, metricName: string): AnalyticsLimitation[] {
  if (!value.denominator) return [limitation('ZERO_DENOMINATOR', `${metricName} has no eligible observations`, metricName)];
  if (!value.isSufficient) return [limitation('INSUFFICIENT_SAMPLE', `${metricName} has fewer than ${ANALYTICS_SAMPLE_THRESHOLD} observations`, metricName)];
  return [];
}

function boolean(value: unknown): boolean { return value === true; }
function number(value: unknown): number | null { return typeof value === 'number' && Number.isFinite(value) ? value : null; }

export function decisionMetrics(records: AnalyticsRecord[]): { metrics: DecisionMetrics; limitations: AnalyticsLimitation[] } {
  const observations = records.map((record) => analyticsInput(record.publicSnapshot)).filter((value): value is AnalyticsInput => value !== null);
  const vpipEligible = observations.filter((value) => boolean(value.vpipEligible));
  const pfrEligible = observations.filter((value) => boolean(value.pfrEligible));
  const threeBetEligible = observations.filter((value) => boolean(value.threeBetEligible));
  const winEligible = observations.filter((value) => boolean(value.winEligible));
  const metrics: DecisionMetrics = {
    scope: 'ALL',
    vpip: metric(vpipEligible.filter((value) => boolean(value.vpipSelected)).length, vpipEligible.length),
    pfr: metric(pfrEligible.filter((value) => boolean(value.pfrSelected)).length, pfrEligible.length),
    threeBet: metric(threeBetEligible.filter((value) => boolean(value.threeBetSelected)).length, threeBetEligible.length),
    winRate: metric(winEligible.filter((value) => boolean(value.won)).length, winEligible.length)
  };
  const limitations = Object.entries(metrics).filter(([key]) => key !== 'scope').flatMap(([key, value]) => metricLimitations(value, key));
  if (!observations.length && records.length) limitations.push(limitation('DATA_UNAVAILABLE', 'Public analytics data is unavailable'));
  if (!records.length) limitations.push(limitation('NO_RESULTS', 'No eligible hands match the selected filters'));
  return { metrics, limitations };
}

export function summarize(records: AnalyticsRecord[]) {
  const inputs = records.map((record) => analyticsInput(record.publicSnapshot));
  const netValues = inputs.map((value) => number(value?.netResult)).filter((value): value is number => value !== null);
  const evValues = inputs.map((value) => number(value?.evResult)).filter((value): value is number => value !== null);
  const decisions = decisionMetrics(records);
  return {
    summary: {
      handsPlayed: records.length,
      netResult: netValues.length ? netValues.reduce((sum, value) => sum + value, 0) : null,
      evResult: evValues.length ? evValues.reduce((sum, value) => sum + value, 0) : null,
      winRate: decisions.metrics.winRate,
      roi: null,
      netResultAvailable: netValues.length > 0,
      evAvailable: evValues.length > 0
    },
    limitations: decisions.limitations.concat(!netValues.length && records.length ? [limitation('DATA_UNAVAILABLE', 'Net result data is unavailable', 'netResult')] : [], !evValues.length && records.length ? [limitation('DATA_UNAVAILABLE', 'EV data is unavailable', 'evResult')] : [])
  };
}

export function trend(records: AnalyticsRecord[]): TrendPoint[] {
  const byDay = new Map<string, AnalyticsRecord[]>();
  records.forEach((record) => { const key = record.endedAt.toISOString().slice(0, 10); byDay.set(key, [...(byDay.get(key) ?? []), record]); });
  return [...byDay.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([day, dayRecords]) => {
    const start = new Date(`${day}T00:00:00.000Z`);
    const net = dayRecords.map((record) => number(analyticsInput(record.publicSnapshot)?.netResult)).filter((value): value is number => value !== null);
    const ev = dayRecords.map((record) => number(analyticsInput(record.publicSnapshot)?.evResult)).filter((value): value is number => value !== null);
    return { periodStart: start.toISOString(), periodEnd: new Date(`${day}T23:59:59.999Z`).toISOString(), hands: dayRecords.length, netResult: net.length ? net.reduce((sum, value) => sum + value, 0) : null, evResult: ev.length ? ev.reduce((sum, value) => sum + value, 0) : null };
  });
}

export function breakdown(records: AnalyticsRecord[], field: 'position' | 'street'): BreakdownRow[] {
  const groups = new Map<string, AnalyticsRecord[]>();
  records.forEach((record) => {
    const input = analyticsInput(record.publicSnapshot);
    if (field === 'position') {
      const key = typeof input?.position === 'string' ? input.position : null;
      if (key) groups.set(key, [...(groups.get(key) ?? []), record]);
      return;
    }
    if (!input?.streetMetrics || typeof input.streetMetrics !== 'object' || Array.isArray(input.streetMetrics)) return;
    Object.entries(input.streetMetrics).forEach(([street, value]) => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return;
      const scopedRecord = { ...record, publicSnapshot: { analytics: value } };
      groups.set(street, [...(groups.get(street) ?? []), scopedRecord]);
    });
  });
  const order = field === 'position' ? ['BTN', 'CO', 'HJ', 'LJ', 'SB', 'BB'] : ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
  return [...groups.entries()].sort(([left], [right]) => (order.indexOf(left) < 0 ? 99 : order.indexOf(left)) - (order.indexOf(right) < 0 ? 99 : order.indexOf(right)) || left.localeCompare(right)).map(([key, group]) => {
    const result = decisionMetrics(group);
    return { key, hands: group.length, metrics: result.metrics, limitations: result.limitations.map((item) => ({ ...item, [field]: key })) };
  });
}

export function relatedHands(records: AnalyticsRecord[], limit: number) {
  return records.slice(-limit).reverse().map((record) => {
    const input = analyticsInput(record.publicSnapshot);
    const contribution = [input?.vpipSelected ? 'VPIP' : null, input?.pfrSelected ? 'PFR' : null, input?.threeBetSelected ? '3BET' : null, input?.won ? 'WIN_RATE' : null].filter((value): value is string => value !== null);
    const policy = record.policies.find((item) => item.canList);
    return { historyId: record.id, endedAt: record.endedAt.toISOString(), format: record.format, status: record.status, contribution, canOpenDetail: policy?.canViewDetail === true, canOpenReplay: policy?.canViewDetail === true };
  });
}