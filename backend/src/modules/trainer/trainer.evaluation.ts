import { calculateEquity } from '../equity/equity.engine.js';
import type { EquityAnalysisResult } from '../equity/equity.types.js';
import type { EvaluationContext } from '../strategy/strategy.types.js';
import type { StrategyRecommendation } from './trainer.strategy.js';

export interface TrainerEvaluation {
  equity: EquityAnalysisResult | null;
  strategy: StrategyRecommendation | null;
  availability: 'AVAILABLE' | 'UNAVAILABLE';
  limitations: string[];
}

export function evaluateTrainerScenario(
  context: EvaluationContext,
  resolveStrategy: (context: EvaluationContext) => StrategyRecommendation | null
): TrainerEvaluation {
  const opponents = context.opponentHoldings ?? [];
  const strategy = resolveStrategy(context);
  const limitations: string[] = [];
  let equity: EquityAnalysisResult | null = null;
  if (opponents.length === 1) {
    equity = calculateEquity({
      street: context.street,
      board: context.board,
      participants: [
        { id: 'hero', holding: { cards: context.heroCards as [{ rank: never; suit: never }, { rank: never; suit: never }] } },
        { id: 'villain', holding: { cards: (opponents[0] as { cards: [{ rank: never; suit: never }, { rank: never; suit: never }] }).cards } }
      ],
      method: context.calculationConfig.method,
      precision: context.calculationConfig.precision
    });
  } else if (opponents.length > 1) {
    limitations.push('Exact multiway equity is not enabled for this Trainer scenario.');
  } else {
    limitations.push('Equity is unavailable because no opponent holding is available.');
  }
  return { equity, strategy, availability: equity && strategy ? 'AVAILABLE' : 'UNAVAILABLE', limitations };
}
