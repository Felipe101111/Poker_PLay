import type { EquityAnalysisResult } from './equity.types.js';

export function projectEquityResult(result: EquityAnalysisResult): EquityAnalysisResult {
  return {
    method: result.method,
    precision: result.precision,
    runoutsEvaluated: result.runoutsEvaluated,
    participants: result.participants.map(({ id, winProbability, equity }) => ({ id, winProbability, equity })),
    tieProbability: result.tieProbability,
    blockedComboCount: result.blockedComboCount,
    remainingWeight: { ...result.remainingWeight },
    inputFingerprint: result.inputFingerprint
  };
}
