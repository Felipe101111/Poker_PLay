import { useState } from 'react';
import { ApiRequestError } from '../services/apiClient';
import { strategyAdministrationApi } from '../services/strategyAdministrationApi';
import { useStrategyAdministrationState } from './strategyAdministrationState';

export function StrategyAdministrationPage() {
  const { datasets, selected, setSelected, loading, error, reload } = useStrategyAdministrationState();
  const [message, setMessage] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);

  async function openVersion(id: string) {
    try { setSelected(await strategyAdministrationApi.getVersion(id)); setMessage(null); } catch (reason) { setMessage(reason instanceof ApiRequestError ? reason.message : 'Unable to load draft'); }
  }

  async function createDataset() {
    if (!draftName.trim()) return;
    setSaving(true); setMessage(null);
    try {
      const dataset = await strategyAdministrationApi.createDataset({ key: draftName.toLowerCase().replace(/\s+/g, '-'), name: draftName });
      const draft = await strategyAdministrationApi.createDraft(dataset.id, { version: 'draft-v1', schemaVersion: '1', gameFormat: 'SIX_MAX_100BB_POSTFLOP', street: 'flop', tableSize: 6, stackAssumptions: ['100bb'], blindAssumptions: ['no-ante'], source: 'editorial', assumptions: [], precision: 0.000001 });
      setSelected(draft); setDraftName(''); await reload();
    } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to create dataset'); } finally { setSaving(false); }
  }

  async function validateSelected() {
    if (!selected) return;
    try { const report = await strategyAdministrationApi.validate(selected.id); setMessage(`Validation: ${(report as { status?: string }).status ?? 'complete'}`); } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to validate draft'); }
  }

  async function publishSelected() {
    if (!selected) return;
    try { const published = await strategyAdministrationApi.publish(selected.id, selected.revision); setSelected(published); setMessage('Published successfully'); await reload(); } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to publish draft'); }
  }

  if (loading) return <main><h1>Strategy administration</h1><p>Loading strategy datasets...</p></main>;
  if (error) return <main><h1>Strategy administration</h1><p role="alert">{error.message}</p></main>;
  return <main>
    <h1>Strategy administration</h1>
    {message && <p role="alert">{message}</p>}
    <form onSubmit={(event) => { event.preventDefault(); void createDataset(); }}><label htmlFor="dataset-name">New dataset</label><input id="dataset-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /><button type="submit" disabled={saving}>Create dataset</button></form>
    {datasets.length === 0 ? <p role="status">No strategy datasets yet.</p> : <ul aria-label="Strategy datasets">{datasets.map((dataset) => <li key={dataset.id}><strong>{dataset.name}</strong> <span>{dataset.key}</span>{dataset.activeVersions.map((version) => <button type="button" key={version.id} onClick={() => void openVersion(version.id)}>{version.version}</button>)}</li>)}</ul>}
    {selected && <section aria-label="Strategy draft"><h2>{selected.version}</h2><p>Status: {selected.status}</p><p>Revision: {selected.revision}</p><p>Rows: {selected.rows.length}</p><p>Server-owned status and revision are read-only.</p>{selected.status === 'DRAFT' && <><button type="button" onClick={() => void validateSelected()}>Validate</button><button type="button" onClick={() => void publishSelected()}>Publish</button></>}</section>}
  </main>;
}
