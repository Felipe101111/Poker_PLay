import { useEffect, useState } from 'react';
import { trainerApi } from '../services/trainerApi';

export function TrainerProgressPage() {
  const [progress, setProgress] = useState<Awaited<ReturnType<typeof trainerApi.progress>>['progress'] | null>(null);
  useEffect(() => { void trainerApi.progress().then((response) => setProgress(response.progress)); }, []);
  if (!progress) return <main><p>Loading progress...</p></main>;
  return <main><h1>Trainer Progress</h1><p>Completed: {progress.completedDecisions}</p><p>Preferred: {progress.preferred}</p><p>Mixed: {progress.acceptableMixed}</p><p>Unavailable: {progress.unavailable}</p></main>;
}
