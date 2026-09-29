import { useCallback, useEffect, useState } from 'react';
import { ApiRequestError } from '../services/apiClient';
import { strategyAdministrationApi, type StrategyDataset, type StrategyVersion } from '../services/strategyAdministrationApi';

export function useStrategyAdministrationState() {
  const [datasets, setDatasets] = useState<StrategyDataset[]>([]);
  const [selected, setSelected] = useState<StrategyVersion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiRequestError | Error | null>(null);
  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { setDatasets((await strategyAdministrationApi.listDatasets()).datasets); } catch (reason) { setError(reason instanceof Error ? reason : new Error('Unable to load strategy administration')); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return { datasets, selected, setSelected, loading, error, reload: load };
}
