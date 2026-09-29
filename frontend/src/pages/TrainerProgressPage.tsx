import { useEffect, useState } from 'react';
import { trainerApi } from '../services/trainerApi';

export function TrainerProgressPage() {
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof trainerApi.progress>>['progress'] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void trainerApi.progress().then((response) => setProgress(response.progress)).catch(() => setError('Unable to load progress')); }, []);
  if (!progress) return <main><p>Loading progress...</p></main>;
  return <main className="page-stack"><h1>Trainer Progress</h1>{error && <p role="alert">{error}</p>}<p>Completed: {progress.completedDecisions}</p><p>Preferred: {progress.preferred}</p><p>Mixed: {progress.acceptableMixed}</p><p>Marginal: {progress.marginal}</p><p>Significant deviation: {progress.significantDeviation}</p><p>Unavailable: {progress.unavailable}</p>{progress.empty && <p role="status">No training decisions yet.</p>}</main>;
}
