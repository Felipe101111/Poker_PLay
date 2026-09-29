import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { handHistoryApi, type HandReplay } from '../services/handHistoryApi';
import { initialReplayNavigation, nextReplayPosition, previousReplayPosition, selectReplayPosition, toggleReplayPlaying, type ReplayNavigationState } from './handReplayState';

const PLAYBACK_INTERVAL_MS = 800;

export function HandReplayPage() {
  const { historyId } = useParams();
  const [replay, setReplay] = useState<HandReplay | null>(null);
  const [navigation, setNavigation] = useState<ReplayNavigationState>(initialReplayNavigation);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setReplay(null);
    setNavigation(initialReplayNavigation());
    setError(null);
    if (!historyId) return () => { active = false; };
    handHistoryApi.replay(historyId).then((response) => { if (active) setReplay(response.replay); }).catch((reason) => { if (active) setError(reason instanceof ApiRequestError ? reason.message : 'Unable to load replay'); });
    return () => { active = false; };
  }, [historyId]);

  useEffect(() => {
    if (!replay || !navigation.isPlaying) return undefined;
    const timer = window.setInterval(() => setNavigation((current) => nextReplayPosition(current, replay)), PLAYBACK_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [navigation.isPlaying, replay]);

  if (error) return <main><p role="alert">{error}</p><Link to={historyId ? `/hand-history/${historyId}` : '/hand-history'}>Back to hand</Link></main>;
  if (!replay) return <main><p>Loading replay...</p></main>;

  const currentEvent = navigation.position === 0 ? null : replay.events[navigation.position - 1];
  const currentState = currentEvent?.stateAfter ?? (navigation.position === 0 ? replay.initialState : null);
  const atEnd = navigation.position >= replay.events.length;

  return <main>
    <Link to={`/hand-history/${replay.historyId}`}>Back to hand</Link>
    <h1>Replay: {replay.format}</h1>
    <p>{replay.status} · {navigation.position} of {replay.events.length} events</p>
    <section aria-label="Replay controls">
      <button type="button" aria-label="Previous event" disabled={navigation.position === 0} onClick={() => setNavigation(previousReplayPosition)}>Previous</button>
      <button type="button" aria-label={navigation.isPlaying ? 'Pause replay' : 'Play replay'} disabled={atEnd} onClick={() => setNavigation((current) => toggleReplayPlaying(current, replay))}>{navigation.isPlaying ? 'Pause' : 'Play'}</button>
      <button type="button" aria-label="Next event" disabled={atEnd} onClick={() => setNavigation((current) => nextReplayPosition(current, replay))}>Next</button>
      <span role="status">{atEnd ? 'Terminal state' : navigation.position === 0 ? 'Initial state' : `Event ${navigation.position}`}</span>
    </section>
    <section aria-label="Current replay state">
      <h2>Current state</h2>
      {currentState ? <pre>{JSON.stringify(currentState, null, 2)}</pre> : <p>This state is unavailable.</p>}
    </section>
    <section aria-label="Replay timeline">
      <h2>Timeline</h2>
      {!replay.events.length ? <p>No visible replay events.</p> : <ol>{replay.events.map((event, index) => <li key={event.sequence}><button type="button" aria-label={`Go to event ${event.sequence}`} onClick={() => setNavigation((current) => selectReplayPosition(current, replay, index))} aria-current={navigation.position === index + 1 ? 'step' : undefined}>{event.street} · {event.actionType} · seat {event.seatNumber ?? '-'}{event.amount === null ? '' : ` · ${event.amount}`}{event.limitation ? ' · Limited' : ''}</button></li>)}</ol>}
    </section>
    {replay.limitations.length > 0 && <section aria-label="Replay limitations"><h2>Limitations</h2><ul>{replay.limitations.map((limitation, index) => <li key={`${limitation.code}-${index}`}>{limitation.message}</li>)}</ul></section>}
  </main>;
}
