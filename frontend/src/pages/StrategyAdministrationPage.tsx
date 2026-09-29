import { useState } from 'react';
import { ApiRequestError } from '../services/apiClient';
import { strategyAdministrationApi, type EditorialRole, type StrategyAuditEntry, type StrategyHistoryEntry } from '../services/strategyAdministrationApi';
import { useStrategyAdministrationState } from './strategyAdministrationState';

export function StrategyAdministrationPage() {
  const { datasets, selected, setSelected, loading, error, reload } = useStrategyAdministrationState();
  const [message, setMessage] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<StrategyHistoryEntry[]>([]);
  const [audit, setAudit] = useState<StrategyAuditEntry[]>([]);
  const [retirementReason, setRetirementReason] = useState('');
  const [roleUserId, setRoleUserId] = useState('');
  const [role, setRole] = useState<EditorialRole>('REVIEWER');

  async function openVersion(id: string) {
    try { setSelected(await strategyAdministrationApi.getVersion(id)); setMessage(null); } catch (reason) { setMessage(reason instanceof ApiRequestError ? reason.message : 'Unable to load draft'); }
  }

  async function openHistory(datasetId: string) {
    try { setHistory((await strategyAdministrationApi.history(datasetId)).history); setMessage(null); } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to load history'); }
  }

  async function openAudit() {
    try { setAudit((await strategyAdministrationApi.audit()).entries); setMessage(null); } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to load audit'); }
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

  async function retireSelected() {
    if (!selected || !retirementReason.trim()) return;
    try { setSelected(await strategyAdministrationApi.retire(selected.id, retirementReason)); setRetirementReason(''); setMessage('Version retired successfully'); await reload(); } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to retire version'); }
  }

  async function assignRole() {
    if (!roleUserId.trim()) return;
    try { const result = await strategyAdministrationApi.assignRole(roleUserId.trim(), role); setMessage(`Role assigned: ${result.role}`); setRoleUserId(''); } catch (reason) { setMessage(reason instanceof ApiRequestError ? `${reason.code}: ${reason.message}` : 'Unable to assign role'); }
  }

  if (loading) return <main><h1>Strategy administration</h1><p>Loading strategy datasets...</p></main>;
  if (error) return <main><h1>Strategy administration</h1><p role="alert">{error.message}</p></main>;
  return <main>
    <h1>Strategy administration</h1>
    {message && <p role="alert">{message}</p>}
    <form onSubmit={(event) => { event.preventDefault(); void createDataset(); }}><label htmlFor="dataset-name">New dataset</label><input id="dataset-name" value={draftName} onChange={(event) => setDraftName(event.target.value)} /><button type="submit" disabled={saving}>Create dataset</button></form>
    <div><button type="button" onClick={() => void openAudit()}>View audit log</button></div>
    {datasets.length === 0 ? <p role="status">No strategy datasets yet.</p> : <ul aria-label="Strategy datasets">{datasets.map((dataset) => <li key={dataset.id}><strong>{dataset.name}</strong> <span>{dataset.key}</span><button type="button" aria-label={`View history for ${dataset.name}`} onClick={() => void openHistory(dataset.id)}>View history</button>{dataset.activeVersions.map((version) => <button type="button" key={version.id} onClick={() => void openVersion(version.id)}>{version.version}</button>)}</li>)}</ul>}
    {history.length > 0 && <section aria-label="Version history"><h2>Version history</h2><ul>{history.map((entry) => <li key={entry.id}>{entry.version} <span>{entry.status}</span> <time dateTime={entry.createdAt}>{entry.createdAt}</time>{entry.retiredAt && <span> Retired</span>}</li>)}</ul></section>}
    {audit.length > 0 && <section aria-label="Audit log"><h2>Audit log</h2><ul>{audit.map((entry) => <li key={entry.id}>{entry.action} <span>{entry.actorRole}</span> <span>{entry.result}</span> <time dateTime={entry.createdAt}>{entry.createdAt}</time>{entry.reason && <span>{entry.reason}</span>}</li>)}</ul></section>}
    {selected && <section aria-label="Strategy draft"><h2>{selected.version}</h2><p>Status: {selected.status}</p><p>Revision: {selected.revision}</p><p>Rows: {selected.rows.length}</p><p>Server-owned status and revision are read-only.</p>{selected.status === 'DRAFT' && <><button type="button" onClick={() => void validateSelected()}>Validate</button><button type="button" onClick={() => void publishSelected()}>Publish</button></>}{selected.status === 'PUBLISHED' && <div><label htmlFor="retirement-reason">Retirement reason</label><input id="retirement-reason" value={retirementReason} onChange={(event) => setRetirementReason(event.target.value)} /><button type="button" disabled={!retirementReason.trim()} onClick={() => void retireSelected()}>Confirm retirement</button><button type="button" onClick={() => void retireSelected()}>Retire version</button></div>}</section>}
    <section aria-label="Role management"><h2>Role management</h2><label htmlFor="role-user-id">User ID</label><input id="role-user-id" value={roleUserId} onChange={(event) => setRoleUserId(event.target.value)} /><label htmlFor="editorial-role">Editorial role</label><select id="editorial-role" value={role} onChange={(event) => setRole(event.target.value as EditorialRole)}><option>USER</option><option>EDITOR</option><option>REVIEWER</option><option>PUBLISHER</option><option>ADMIN</option></select><button type="button" disabled={!roleUserId.trim()} onClick={() => void assignRole()}>Assign role</button></section>
  </main>;
}
