import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { handHistoryApi, type HandHistoryDetail } from '../services/handHistoryApi';

export function HandHistoryDetailPage() {
  const { historyId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<HandHistoryDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => { if (historyId) handHistoryApi.detail(historyId).then(setData).catch((reason) => setError(reason instanceof ApiRequestError ? reason.message : 'Unable to load hand')); }, [historyId]);
  async function remove() { if (!historyId) return; try { await handHistoryApi.remove(historyId); setMessage('This hand was removed from your history.'); navigate('/hand-history'); } catch (reason) { setError(reason instanceof ApiRequestError ? reason.message : 'Unable to update privacy'); } }
  if (error) return <main><p role="alert">{error}</p><Link to="/hand-history">Back to history</Link></main>;
  if (!data) return <main><p>Loading hand...</p></main>;
  const hand = data.hand;
  return <main><Link to="/hand-history">Back to history</Link><h1>{hand.format}</h1><p>{hand.status} · {new Date(hand.endedAt).toLocaleString()}</p><p>Board: {hand.board.map(String).join(' ') || 'Unavailable'}</p><p><Link to={`/hand-history/${historyId}/replay`}>Open replay</Link></p><section aria-label="Participants"><h2>Participants</h2><ul>{hand.participants.map((participant) => <li key={participant.seatNumber}>{participant.displayName} · seat {participant.seatNumber}{participant.isViewer ? ' · You' : ''}</li>)}</ul></section><section aria-label="Actions"><h2>Actions</h2><ol>{hand.actions.map((action) => <li key={action.sequence}>{action.street} · {action.type} · seat {action.seatNumber ?? '-'}{action.amount === null ? '' : ` · ${action.amount}`}</li>)}</ol></section>{hand.limitations.length > 0 && <p>Some legacy data is unavailable.</p>}{message && <p role="status">{message}</p>}<button type="button" onClick={() => void remove()}>Remove from my history</button></main>;
}