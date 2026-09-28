import { useEffect, useState } from 'react';
import { trainerApi, type TrainerResponse } from '../services/trainerApi';

export function TrainerPage() {
  const [state, setState] = useState<TrainerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    setBusy(true); setError(null);
    try { setState(await trainerApi.current()); } catch { try { setState(await trainerApi.start()); } catch { setError('Unable to load trainer session'); } } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  const isPostflop = state?.session.format === 'SIX_MAX_100BB_POSTFLOP';
  async function submit(type: string, amountBB?: number) {
    if (!state?.scenario) return;
    setBusy(true); setError(null);
    try {
      const action = { type, ...(amountBB === undefined ? {} : { amountBB }) };
      const result = isPostflop
        ? await trainerApi.postflopDecide(state.scenario.id, crypto.randomUUID(), action)
        : await trainerApi.decide(state.scenario.id, crypto.randomUUID(), action);
      setState({ ...state, latestDecision: result.decision }); setMessage(result.duplicate ? 'Decision restored.' : 'Decision recorded.');
    } catch { setError('That action is not available'); } finally { setBusy(false); }
  }
  async function nextScenario() {
    if (!state?.latestDecision) return;
    setBusy(true); setError(null); setMessage(null);
    try { const result = isPostflop ? await trainerApi.postflopNext(state.latestDecision.id, crypto.randomUUID()) : await trainerApi.next(state.latestDecision.id, crypto.randomUUID()); setState(result); setMessage('Next scenario loaded.'); } catch { setError('Unable to load the next scenario'); } finally { setBusy(false); }
  }
  if (busy && !state) return <main><p>Loading trainer...</p></main>;
  if (error && !state) return <main><p role="alert">{error}</p></main>;
  return <main>
    <h1>Poker Trainer</h1>
    {error && <p role="alert">{error}</p>}
    {message && <p role="status">{message}</p>}
    {state?.scenario && <section aria-label="Training scenario">
      {state.scenario.street && <p>Street: {state.scenario.street} | Board: {state.scenario.board?.map((card) => `${card.rank}${card.suit}`).join(' ')}</p>}
      {state.scenario.potBB !== undefined && <p>Pot: {state.scenario.potBB} BB</p>}
      <p>Position: {state.scenario.position} | Stack: {state.scenario.effectiveStackBB} BB</p>
      <p>Cards: {state.scenario.holeCards.map((card) => `${card.rank}${card.suit}`).join(' ')}</p>
      <p>Blinds: {state.scenario.blindContext.smallBlind}/{state.scenario.blindContext.bigBlind}</p>
      <p>Prior actions: {state.scenario.priorActions.length ? state.scenario.priorActions.map((action) => (action as { type: string }).type).join(', ') : 'None'}</p>
      <div aria-label="Legal actions">{state.scenario.legalActions.actions.map((action) => { const amount = action === 'bet' || action === 'raise' ? state.scenario?.legalActions.minBetOrRaiseBB ?? undefined : undefined; return <button key={action} type="button" disabled={busy || Boolean(state.latestDecision)} onClick={() => void submit(action, amount)}>{action}</button>; })}</div>
    </section>}
    {state?.latestDecision && <section aria-label="Decision result"><h2>{state.latestDecision.category ?? state.latestDecision.evaluationStatus}</h2><p>{state.latestDecision.explanation.factors.join(', ')}</p>{state.latestDecision.equity && <section aria-label="Equity result"><p>Exact equity, {state.latestDecision.equity.runoutsEvaluated} runouts</p>{state.latestDecision.equity.participants.map((participant) => <p key={participant.id}>{participant.id}: {(participant.equity * 100).toFixed(2)}% equity</p>)}<p>Tie probability: {(state.latestDecision.equity.tieProbability * 100).toFixed(2)}%</p></section>}<button type="button" disabled={busy} onClick={() => void nextScenario()}>Next scenario</button></section>}
    {isPostflop && state.history && state.history.length > 0 && <section aria-label="Decision history"><h2>Street review</h2>{state.history.map((decision, index) => <p key={decision.id}>{decision.street ?? `Street ${index + 1}`}: {decision.category ?? decision.evaluationStatus}</p>)}</section>}
  </main>;
}
