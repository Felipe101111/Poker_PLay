import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ApiRequestError } from '../services/apiClient';
import { multiplayerTrainingApi, type TrainingDecision, type TrainingResponse } from '../services/multiplayerTrainingApi';
import { createMultiplayerSocket, joinTraining, leaveTraining, type TrainingDecisionEvent, type TrainingJoinedEvent } from '../services/multiplayerSocket';

export function MultiplayerTrainingPage() {
  const { roomId = '' } = useParams();
  const [training, setTraining] = useState<TrainingResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<ReturnType<typeof createMultiplayerSocket> | null>(null);

  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    const socket = createMultiplayerSocket();
    socketRef.current = socket;
    multiplayerTrainingApi.get(roomId)
      .then((response) => {
        if (!cancelled) {
          setTraining(response);
          joinTraining(socket, roomId);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled && err instanceof ApiRequestError && err.code === 'TRAINING_NOT_FOUND') setMessage('Join the training overlay to receive private feedback.');
        else if (!cancelled) setError(err instanceof ApiRequestError ? err.message : 'Could not load training.');
      });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('training:joined', (event: TrainingJoinedEvent) => {
      if (event.roomId === roomId) setMessage('Training joined.');
    });
    socket.on('training:decision-evaluated', (event: TrainingDecisionEvent) => {
      if (event.roomId !== roomId) return;
      setTraining((current) => current ? { ...current, training: { ...current.training, decisions: [event.decision, ...current.training.decisions.filter((item) => item.id !== event.decision.id)] } } : current);
    });

    return () => {
      cancelled = true;
      leaveTraining(socket, roomId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId]);

  async function join() {
    if (!roomId) return;
    try {
      const response = await multiplayerTrainingApi.join(roomId);
      setTraining(response);
      setMessage('Training joined.');
      setError(null);
      if (socketRef.current) joinTraining(socketRef.current, roomId);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not join training.');
    }
  }

  async function leave() {
    if (!roomId) return;
    try {
      await multiplayerTrainingApi.leave(roomId);
      setTraining((current) => current ? { ...current, training: { ...current.training, participant: { ...current.training.participant, status: 'LEFT' } } } : current);
      setMessage('Training feedback capture stopped.');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not leave training.');
    }
  }

  if (error) return <main><p role="alert">{error}</p></main>;
  if (!training) return <main><p>{message ?? 'Loading training...'}</p>{message && <button type="button" onClick={join}>Join training</button>}</main>;

  const decisions = training.training.decisions;
  return (
    <main className="page-stack">
      <h1>Multiplayer training</h1>
      <p>{connected ? 'Connected' : 'Connecting'} · {training.training.status} · Seat {training.training.participant.seatNumber}</p>
      {message && <p role="status">{message}</p>}
      <p>Table version {training.table.stateVersion} · Hand {training.table.handNumber}</p>
      {training.training.participant.status === 'ENROLLED' && <button type="button" onClick={leave}>Leave training</button>}
      <section aria-label="Private feedback">
        <h2>Your decisions</h2>
        {decisions.length === 0 ? <p>No accepted decisions yet.</p> : <ul>{decisions.map((decision) => <DecisionItem key={decision.id} decision={decision} />)}</ul>}
      </section>
    </main>
  );
}

function DecisionItem({ decision }: { decision: TrainingDecision }) {
  const limitations = decision.explanation.limitations ?? [];
  return <li><strong>{decision.street}</strong>: {decision.selectedAction.type}{decision.selectedAction.amount == null ? '' : ` ${decision.selectedAction.amount}`} · {decision.evaluationStatus}{decision.category ? ` · ${decision.category}` : ''}{limitations.length > 0 && <span> · {limitations.join(', ')}</span>}</li>;
}
