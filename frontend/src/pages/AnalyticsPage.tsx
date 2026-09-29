import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { handAnalyticsApi, type AnalyticsResponse, type MetricValue } from '../services/handAnalyticsApi';
import { filtersFromParams, paramsFromFilters } from './analyticsState';

function metricLabel(value: MetricValue) { return value.value === null ? 'n/a' : `${(value.value * 100).toFixed(1)}%`; }
function sampleLabel(value: MetricValue) { return value.isSufficient ? `${value.numerator}/${value.denominator}` : `Limited sample: ${value.numerator}/${value.denominator}`; }

export function AnalyticsPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [breakdownView, setBreakdownView] = useState<'position' | 'street'>('position');
  const filters = filtersFromParams(params);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    handAnalyticsApi.get(filters).then((result) => { if (active) setData(result); }).catch((reason) => { if (active) setError(reason instanceof ApiRequestError ? reason.message : 'Unable to load analytics'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params]);

  function updateFilter(key: string, value: string) {
    const next = paramsFromFilters({ ...filters, [key]: value || undefined });
    setParams(next);
  }

  if (loading) return <main><h1>Analytics</h1><p>Loading analytics...</p></main>;
  if (error) return <main><h1>Analytics</h1><p role="alert">{error}</p></main>;
  if (!data) return <main><h1>Analytics</h1><p>No analytics available.</p></main>;
  const analytics = data.analytics;
  return <main>
    <p><Link to="/hand-history">Hand history</Link></p>
    <h1>Analytics</h1>
    <form aria-label="Analytics filters">
      <label htmlFor="analytics-from">From</label><input id="analytics-from" type="date" value={filters.from?.slice(0, 10) ?? ''} onChange={(event) => updateFilter('from', event.target.value ? `${event.target.value}T00:00:00.000Z` : '')} />
      <label htmlFor="analytics-to">To</label><input id="analytics-to" type="date" value={filters.to?.slice(0, 10) ?? ''} onChange={(event) => updateFilter('to', event.target.value ? `${event.target.value}T23:59:59.999Z` : '')} />
      <label htmlFor="analytics-format">Format</label><input id="analytics-format" value={filters.format ?? ''} onChange={(event) => updateFilter('format', event.target.value)} />
    </form>
    {!analytics.filters.eligibleHands ? <p role="status">No eligible hands found for this period.</p> : <>
      <p>{analytics.filters.eligibleHands} eligible hands</p>
      <section aria-label="Performance summary"><h2>Performance</h2><p>Hands: {analytics.summary.handsPlayed}</p><p>Net result: {analytics.summary.netResult ?? 'n/a'}</p><p>EV result: {analytics.summary.evResult ?? 'n/a'}</p><p>Win rate: {metricLabel(analytics.summary.winRate)} ({sampleLabel(analytics.summary.winRate)})</p></section>
      <section aria-label="Decision metrics"><h2>Decision patterns</h2><p>VPIP: {metricLabel(analytics.overall.vpip)} ({sampleLabel(analytics.overall.vpip)})</p><p>PFR: {metricLabel(analytics.overall.pfr)} ({sampleLabel(analytics.overall.pfr)})</p><p>3-bet: {metricLabel(analytics.overall.threeBet)} ({sampleLabel(analytics.overall.threeBet)})</p><p>Win rate: {metricLabel(analytics.overall.winRate)} ({sampleLabel(analytics.overall.winRate)})</p><div role="tablist" aria-label="Breakdown scope"><button type="button" role="tab" aria-selected={breakdownView === 'position'} onClick={() => setBreakdownView('position')}>Position</button><button type="button" role="tab" aria-selected={breakdownView === 'street'} onClick={() => setBreakdownView('street')}>Street</button></div><h3>{breakdownView === 'position' ? 'By position' : 'By street'}</h3><ul>{(breakdownView === 'position' ? analytics.byPosition : analytics.byStreet).map((row) => <li key={`${breakdownView}-${row.key}`}>{row.key}: {row.hands} hands, VPIP {metricLabel(row.metrics.vpip)}</li>)}</ul></section>
      <section aria-label="Trend"><h2>Trend</h2><ul>{analytics.trend.map((point) => <li key={point.periodStart}>{point.periodStart.slice(0, 10)}: {point.hands} hands, net {point.netResult ?? 'n/a'}, EV {point.evResult ?? 'n/a'}</li>)}</ul></section>
      <section aria-label="Related hands"><h2>Related hands</h2><ul>{analytics.relatedHands.map((hand) => <li key={hand.historyId}>{hand.endedAt.slice(0, 10)} {hand.format} ({hand.contribution.join(', ') || 'summary'}) {hand.canOpenDetail && <Link to={`/hand-history/${hand.historyId}?${params.toString()}`}>Details</Link>} {hand.canOpenReplay && <Link to={`/hand-history/${hand.historyId}/replay?${params.toString()}`}>Replay</Link>}</li>)}</ul></section>
    </>}
    {analytics.limitations.length > 0 && <section aria-label="Analytics limitations"><h2>Limitations</h2><ul>{analytics.limitations.map((item, index) => <li key={`${item.code}-${item.metric ?? index}`}>{item.message}</li>)}</ul></section>}
  </main>;
}