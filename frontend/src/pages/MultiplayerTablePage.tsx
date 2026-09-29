import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { multiplayerApi, type ActionType, type TableView } from '../services/multiplayerApi';
import { abandonTable, createMultiplayerSocket, joinTable, leaveTable, sendTableAction, sendTableHeartbeat, type TableErrorEvent, type TablePresenceEvent, type TableSnapshotEvent, type TableStateChangedEvent } from '../services/multiplayerSocket';

export function MultiplayerTablePage() {
  const { roomId = '' } = useParams();
  const navigate = useNavigate();
  const [table, setTable] = useState<TableView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [abandoning, setAbandoning] = useState(false);
  const [amount, setAmount] = useState('');
  const socketRef = useRef<ReturnType<typeof createMultiplayerSocket> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const socket = createMultiplayerSocket();
    socketRef.current = socket;
    multiplayerApi.get(roomId)
      .then((response) => {
        if (!cancelled) setTable(response.table);
        joinTable(socket, roomId, response.table.stateVersion);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not load table.');
      });

    const acceptSnapshot = (event: TableSnapshotEvent) => {
      setTable((current) => !current || event.stateVersion >= current.stateVersion ? event.table : current);
    };
    const acceptStateChange = (event: TableStateChangedEvent) => acceptSnapshot(event);
    const recover = () => {
      multiplayerApi.reconnect(roomId, 0).then((response) => {
        if (!cancelled) setTable((current) => !current || response.table.stateVersion >= current.stateVersion ? response.table : current);
      }).catch((err: unknown) => {
        if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not recover the table.');
      });
    };
    const acceptError = (event: TableErrorEvent) => {
      if (event.code === 'STALE_GAME_STATE' || event.code === 'NOT_YOUR_TURN') recover();
      else setError(event.message);
    };
    const acceptPresence = (event: TablePresenceEvent) => {
      if (event.roomId !== roomId) return;
      setTable((current) => current ? {
        ...current,
        currentHand: current.currentHand ? {
          ...current.currentHand,
          players: current.currentHand.players.map((player) => player.userId === event.userId ? { ...player, connectionStatus: event.status } : player)
        } : null
      } : current);
    };
    const heartbeat = window.setInterval(() => sendTableHeartbeat(socket, roomId), 25_000);
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('table:snapshot', acceptSnapshot);
    socket.on('table:state-changed', acceptStateChange);
    socket.on('table:error', acceptError);
    socket.on('table:presence-changed', acceptPresence);

    return () => {
      cancelled = true;
      window.clearInterval(heartbeat);
      leaveTable(socket, roomId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  function submitAction(type: ActionType) {
    if (!table?.currentHand || !roomId) return;
    if (!socketRef.current) return;
    sendTableAction(socketRef.current, roomId, {
      handId: table.currentHand.id,
      expectedVersion: table.stateVersion,
      requestId: crypto.randomUUID(),
      type,
      ...((type === 'bet' || type === 'raise') && amount ? { amount: Number(amount) } : {})
    }, (response) => {
      if (!response.ok && (response.code === 'STALE_GAME_STATE' || response.code === 'NOT_YOUR_TURN')) {
        void multiplayerApi.reconnect(roomId, table.stateVersion).then((result) => setTable((current) => !current || result.table.stateVersion >= current.stateVersion ? result.table : current));
      } else if (!response.ok) {
        setError(response.message ?? 'Action rejected.');
      }
    });
  }

  function abandonGame() {
    if (!roomId || !socketRef.current || !window.confirm('Abandon this game? Your hand will be folded and you will leave the table.')) return;
    setAbandoning(true);
    abandonTable(socketRef.current, roomId, (response) => {
      if (response.ok) navigate('/rooms', { replace: true });
      else {
        setAbandoning(false);
        setError(response.message ?? 'Could not abandon the game.');
      }
    });
  }

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!table) return <main><p>Loading table...</p></main>;

  const hand = table.currentHand;
  const actions = hand?.legalActions?.actions ?? [];
  return (
    <main className="page-stack">
      <h1>Live table</h1>
      <nav aria-label="Table navigation">
        <button type="button" onClick={() => navigate('/rooms')}>Back to rooms</button>
        <button type="button" onClick={abandonGame} disabled={!connected || abandoning}>
          {abandoning ? 'Leaving game...' : 'Abandon game'}
        </button>
      </nav>
      <p>{connected ? 'Connected' : 'Connecting'} · Hand {table.handNumber} · Version {table.stateVersion}</p>
      {table.status === 'CLOSED' && <p role="status">This table is closed.</p>}
      {table.lastCompletedHand && <section aria-label="Last hand result">
        <h2>Hand {table.lastCompletedHand.handNumber} result</h2>
        <p>Pot awards: {table.lastCompletedHand.result.potsAwarded.map((pot) => `${pot.amount} to ${pot.winners?.join(', ') ?? 'none'}`).join(' · ')}</p>
      </section>}
      {hand && <>
        <p>{hand.street} · Pot {hand.pot} · Acting seat {hand.actingSeat ?? 'none'}</p>
        <p>Board: {hand.board.map((card) => `${card.rank}${card.suit}`).join(' ') || 'No cards yet'}</p>
        <p>Your cards: {hand.privateCards.map((card) => `${card.rank}${card.suit}`).join(' ') || 'Hidden'}</p>
        {hand.result && <p role="status">Hand result recorded: {hand.result.potsAwarded.map((pot) => `${pot.amount} to ${pot.winners?.join(', ') ?? 'none'}`).join(' · ')}</p>}
        <section aria-label="Players"><ul>{hand.players.map((player) => <li key={player.userId}>Seat {player.seatNumber}: {player.username} · {player.stack} · {player.connectionStatus}{player.folded ? ' · Folded' : ''}{player.eliminated ? ' · Eliminated' : ''}</li>)}</ul></section>
        <label>Bet or raise amount <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <section aria-label="Actions">{actions.map((action) => <button key={action} type="button" onClick={() => submitAction(action)}>{action}</button>)}</section>
      </>}
    </main>
  );
}
