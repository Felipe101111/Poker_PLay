import { ApiError } from '../../shared/errors.js';
import type { AnalyticsFilter, HandHistoryQuery, TerminalHandSnapshot } from './hand-history.types.js';
import { findForReplay, findForUser, listAnalyticsForUser, listForUser, publishTerminal, removeUserPolicy } from './hand-history.repository.js';
import { projectDetail, projectSummary } from './hand-history.projection.js';
import { projectReplay } from './hand-history.replay.js';
import { breakdown, decisionMetrics, relatedHands, summarize, trend } from './hand-history.analytics.js';

export const handHistoryService = {
  async publish(snapshot: TerminalHandSnapshot) {
    if (!snapshot.endedAt || new Date(snapshot.endedAt) < new Date(snapshot.startedAt)) throw new ApiError(409, 'HAND_HISTORY_NOT_TERMINAL', 'A history record requires a valid terminal timestamp');
    if (!snapshot.status) throw new ApiError(409, 'HAND_HISTORY_NOT_TERMINAL', 'Only terminal hands can be published');
    return publishTerminal(snapshot);
  },
  async list(userId: string, query: HandHistoryQuery) {
    const result = await listForUser(userId, query);
    return { items: result.items.map((item) => projectSummary(item)), page: query.page, pageSize: query.pageSize, total: result.total, hasNextPage: query.page * query.pageSize < result.total };
  },
  async analytics(userId: string, filter: AnalyticsFilter) {
    const records = await listAnalyticsForUser(userId, filter);
    const summary = summarize(records);
    const decisions = decisionMetrics(records);
    return {
      analytics: {
        filters: { ...filter, eligibleHands: records.length },
        summary: summary.summary,
        trend: trend(records),
        overall: decisions.metrics,
        byPosition: breakdown(records, 'position'),
        byStreet: breakdown(records, 'street'),
        relatedHands: relatedHands(records, filter.relatedLimit),
        limitations: [...summary.limitations, ...decisions.limitations]
      }
    };
  },
  async detail(userId: string, historyId: string) {
    const record = await findForUser(historyId, userId);
    if (!record) throw new ApiError(404, 'HAND_HISTORY_NOT_FOUND', 'Hand history not found');
    return { hand: projectDetail(record, userId) };
  },
  async replay(userId: string, historyId: string) {
    const record = await findForReplay(historyId, userId);
    if (!record) throw new ApiError(404, 'HAND_HISTORY_NOT_FOUND', 'Hand history not found');
    const replay = projectReplay(record, userId);
    if (replay.events.length === 0 && replay.limitations.every((item) => item.code === 'NO_VISIBLE_EVENTS' || item.code === 'UNAVAILABLE_STATE')) {
      throw new ApiError(409, 'HAND_HISTORY_REPLAY_UNAVAILABLE', 'Replay data is not available for this hand');
    }
    return { replay };
  },
  async remove(userId: string, historyId: string) {
    const result = await removeUserPolicy(historyId, userId);
    if (!result || (typeof result === 'object' && 'count' in result && result.count === 0)) throw new ApiError(404, 'HAND_HISTORY_NOT_FOUND', 'Hand history not found');
    return { result: { historyId, status: 'ANONYMIZED', visibleInMyHistory: false } };
  }
};