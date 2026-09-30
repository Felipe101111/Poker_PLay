import { useState } from 'react';
import { PokerTable } from '../components/PokerTable';
import { localGameApi, type HandStateView } from '../services/localGameApi';
import { ApiRequestError } from '../services/apiClient';

export function LocalGamePage() {
  const [hand, setHand] = useState<HandStateView | null>(null);
  const [asSeat, setAsSeat] = useState(1);
  const [seatCount, setSeatCount] = useState(4);
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh(seat: number) {
    try {
      setHand(await localGameApi.getState(seat));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load hand state.');
    }
  }

  async function handleStart() {
    setError(null);
    try {
      const started = await localGameApi.startHand(seatCount);
      setHand(started);
      setAsSeat(1);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not start hand.');
    }
  }

  async function handleAbandon() {
    try {
      await localGameApi.abandon();
      setHand(null);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not abandon hand.');
    }
  }

  async function handleSwitchSeat(seat: number) {
    setAsSeat(seat);
    await refresh(seat);
  }

  async function handleAction(type: string) {
    if (!hand?.legalActions || hand.legalActions.seatNumber !== hand.seatToAct) return;

    try {
      const actionAmount = type === 'bet' || type === 'raise' ? Number(amount) : undefined;
      const updated = await localGameApi.submitAction(hand.legalActions.seatNumber, type, actionAmount);
      setHand(updated);
      setAmount('');
      setError(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not submit action.');
    }
  }

  const legalActions = hand?.legalActions;

  return (
    <div className="page-stack table-page">
      <h1>Local Poker Table</h1>
      {error && <p role="alert">{error}</p>}

      {!hand && (
        <section>
          <label htmlFor="seatCount">Seats (2-9)</label>
          <input
            id="seatCount"
            type="number"
            min={2}
            max={9}
            value={seatCount}
            onChange={(e) => setSeatCount(Number(e.target.value))}
          />
          <button type="button" onClick={handleStart}>
            Start hand
          </button>
        </section>
      )}

      {hand && (
        <>
          <PokerTable handId={hand.id} board={hand.communityCards}
            players={hand.seats.map((seat) => ({ ...seat, username: `Seat ${seat.seatNumber}` }))}
            pot={hand.pots.reduce((total, pot) => total + pot.amount, 0)}
            street={hand.bettingRound} actingSeat={hand.seatToAct}
            winningSeats={hand.result?.potsAwarded.flatMap((pot) => pot.winners ?? [])} />

          {legalActions && hand.seatToAct === asSeat && legalActions.seatNumber === asSeat && (
            <div className="table-controls">
              <h2>Your turn: Seat {asSeat}</h2>
              <div className="table-actions">
              {(legalActions.actions.includes('bet') || legalActions.actions.includes('raise')) && (
                <label htmlFor="betAmount">
                  Amount ({legalActions.minBetOrRaise}-{legalActions.maxBetOrRaise})
                  <input
                    id="betAmount"
                    type="number"
                    min={legalActions.minBetOrRaise ?? undefined}
                    max={legalActions.maxBetOrRaise ?? undefined}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                  />
                </label>
              )}
              <div className="table-actions__buttons" role="group" aria-label="Actions">{legalActions.actions.map((action) => (
                <button
                  key={action}
                  type="button"
                  data-action={action}
                  onClick={() => handleAction(action)}
                  disabled={(action === 'bet' || action === 'raise') && !amount}
                >
                  {action === 'call' && legalActions.callAmount !== null
                    ? `Call ${legalActions.callAmount}`
                    : action}
                </button>
              ))}</div>
              </div>
            </div>
          )}

          <div className="table-controls">
            <div>
            <label htmlFor="asSeat">View as seat</label>
            <select id="asSeat" value={asSeat} onChange={(e) => handleSwitchSeat(Number(e.target.value))}>
              {hand.seats.map((s) => (
                <option key={s.seatNumber} value={s.seatNumber}>
                  Seat {s.seatNumber}
                </option>
              ))}
            </select>
            </div>

          <button type="button" onClick={handleAbandon}>
            Abandon hand
          </button>
          </div>

          {hand.result && (
            <div role="region" aria-label="Hand result">
              <h2>Hand complete</h2>
              {hand.result.potsAwarded.map((pot, index) => (
                <p key={index}>
                  Pot {index + 1}: {pot.amount} chips, winner(s): {pot.winners?.join(', ') || '—'}
                </p>
              ))}
              {Object.entries(hand.result.handRanks).map(([seatNumber, rank]) => (
                <p key={seatNumber}>
                  Seat {seatNumber} hand category: {['high card', 'pair', 'two pair', 'three of a kind', 'straight', 'flush', 'full house', 'four of a kind', 'straight flush'][rank[0]] ?? 'unknown'}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
