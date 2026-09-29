import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { handHistoryApi, type HandHistoryListResponse } from '../services/handHistoryApi';

export function HandHistoryPage() {
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState<HandHistoryListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const page = Number(params.get('page') ?? '1');

  useEffect(() => {
    setLoading(true);
    handHistoryApi.list({ page, pageSize: Number(params.get('pageSize') ?? '25'), from: params.get('from') ?? undefined, to: params.get('to') ?? undefined, format: params.get('format') ?? undefined, result: params.get('result') ?? undefined, participant: params.get('participant') ?? undefined, direction: (params.get('direction') as 'asc' | 'desc' | null) ?? 'desc' })
      .then(setData).catch((reason) => setError(reason instanceof ApiRequestError ? reason.message : 'Unable to load hand history')).finally(() => setLoading(false));
  }, [page, params]);

  function setFilter(key: string, value: string) { const next = new URLSearchParams(params); if (value) next.set(key, value); else next.delete(key); next.set('page', '1'); setParams(next); }
  if (loading) return <main><p>Loading hand history...</p></main>;
  if (error) return <main><p role="alert">{error}</p></main>;
  return <main>
    <h1>Hand history</h1>
    <section aria-label="History filters">
      <label>Format <input value={params.get('format') ?? ''} onChange={(event) => setFilter('format', event.target.value)} /></label>
      <label>Result <select value={params.get('result') ?? ''} onChange={(event) => setFilter('result', event.target.value)}><option value="">All results</option><option value="COMPLETED">Completed</option><option value="FOLDED">Folded</option><option value="ALL_IN">All-in</option><option value="ABANDONED">Abandoned</option></select></label>
      <label>Direction <select value={params.get('direction') ?? 'desc'} onChange={(event) => setFilter('direction', event.target.value)}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
    </section>
    {!data?.items.length ? <p>No completed hands found.</p> : <ul>{data.items.map((item) => <li key={item.id}><Link to={`/hand-history/${item.id}`}>{item.format} · {item.status} · {new Date(item.endedAt).toLocaleString()}</Link><span> Pot: {item.summary.pot ?? 'n/a'} · {item.summary.result ?? 'No result'}</span></li>)}</ul>}
    <p>Showing {data?.items.length ?? 0} of {data?.total ?? 0}</p>
    <button type="button" disabled={page <= 1} onClick={() => setFilter('page', String(page - 1))}>Previous</button>
    <button type="button" disabled={!data?.hasNextPage} onClick={() => setFilter('page', String(page + 1))}>Next</button>
  </main>;
}