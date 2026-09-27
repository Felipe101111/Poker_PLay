import { useEffect, useState } from 'react';
import { trainerApi, type TrainerResponse } from '../services/trainerApi';

export function TrainerPage() {
  const [state, setState] = useState<TrainerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true); setError(null);
    try { setState(await trainerApi.current()); } catch { try { setState(await trainerApi.start()); } catch { setError('Unable to load trainer session'); } } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, []);
  async function submit(type: string) {
    if (!state?.scenario) return;
    setBusy(true); setError(null);
    try { const result = await trainerApi.decide(state.scenario.id, crypto.randomUUID(), { type }); setState({ ...state, latestDecision: result.decision }); } catch { setError('That action is not available'); } finally { setBusy(false); }
  }
  if (busy && !state) return <main><p>Loading trainer...</p></main>;
  if (error && !state) return <main><p role="alert">{error}</p></main>;
  return <main>
    <h1>Poker Trainer</h1>
    {error && <p role="alert">{error}</p>}
    {state?.scenario && <section aria-label="Training scenario">
      <p>Position: {state.scenario.position} | Stack: {state.scenario.effectiveStackBB} BB</p>
      <p>Cards: {state.scenario.holeCards.map((card) => `${card.rank}${card.suit}`).join(' ')}</p>
      <p>Blinds: {state.scenario.blindContext.smallBlind}/{state.scenario.blindContext.bigBlind}</p>
      <div>{state.scenario.legalActions.actions.map((action) => <button key={action} type="button" disabled={busy} onClick={() => void submit(action)}>{action}</button>)}</div>
    </section>}
    {state?.latestDecision && <section aria-label="Decision result"><h2>{state.latestDecision.category ?? state.latestDecision.evaluationStatus}</h2><p>{state.latestDecision.explanation.factors.join(', ')}</p></section>}
  </main>;
}
