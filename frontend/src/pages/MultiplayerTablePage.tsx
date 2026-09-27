import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { multiplayerApi, type ActionType, type TableView } from '../services/multiplayerApi';
import { createMultiplayerSocket, joinTable, leaveTable, sendTableAction, sendTableHeartbeat, type TableErrorEvent, type TablePresenceEvent, type TableSnapshotEvent, type TableStateChangedEvent } from '../services/multiplayerSocket';

export function MultiplayerTablePage() {
  const { roomId = '' } = useParams();
  const [table, setTable] = useState<TableView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
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
          players: current.currentHand.players.map((player) => player.userId === event.userId ? { ...player, connectionStatus: event.connectionStatus } : player)
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

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!table) return <main><p>Loading table...</p></main>;

  const hand = table.currentHand;
  const actions = hand?.legalActions?.actions ?? [];
  return (
    <main>
      <h1>Live table</h1>
      <p>{connected ? 'Connected' : 'Connecting'} · Hand {table.handNumber} · Version {table.stateVersion}</p>
      {table.status === 'CLOSED' && <p role="status">This table is closed.</p>}
      {hand && <>
        <p>{hand.street} · Pot {hand.pot} · Acting seat {hand.actingSeat ?? 'none'}</p>
        <p>Board: {hand.board.map((card) => `${card.rank}${card.suit}`).join(' ') || 'No cards yet'}</p>
        <p>Your cards: {hand.privateCards.map((card) => `${card.rank}${card.suit}`).join(' ') || 'Hidden'}</p>
        <section aria-label="Players"><ul>{hand.players.map((player) => <li key={player.userId}>Seat {player.seatNumber}: {player.username} · {player.stack} · {player.connectionStatus}{player.folded ? ' · Folded' : ''}{player.eliminated ? ' · Eliminated' : ''}</li>)}</ul></section>
        <label>Bet or raise amount <input type="number" min="0" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
        <section aria-label="Actions">{actions.map((action) => <button key={action} type="button" onClick={() => submitAction(action)}>{action}</button>)}</section>
      </>}
    </main>
  );
}
