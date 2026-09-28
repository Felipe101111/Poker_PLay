import { z } from 'zod';
import type { EquityAnalysisRequest, Street } from './equity.types.js';
import { ApiError } from '../../shared/errors.js';

const rank = z.enum(['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A']);
const suit = z.enum(['s', 'h', 'd', 'c']);
export const cardSchema = z.object({ rank, suit });
export const comboSchema = z.object({
  cards: z.tuple([cardSchema, cardSchema]),
  weight: z.number().finite().min(0).max(1),
  sourceWeight: z.number().finite().min(0).max(1).optional(),
  blocked: z.boolean().optional()
});
export const rangeSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  combos: z.array(comboSchema).min(1),
  normalizationFactor: z.number().finite().positive().optional(),
  totalWeight: z.number().finite().min(0).optional(),
  sourceNotation: z.string().optional()
});
const participantSchema = z.object({
  id: z.string().min(1),
  holding: z.object({ cards: z.tuple([cardSchema, cardSchema]) }).optional(),
  range: rangeSchema.optional()
}).refine((value) => Boolean(value.holding) !== Boolean(value.range), 'Participant must have exactly one holding or range');

export const equityRequestSchema = z.object({
  street: z.enum(['preflop', 'flop', 'turn', 'river']),
  board: z.array(cardSchema),
  participants: z.array(participantSchema).min(2),
  method: z.literal('EXACT'),
  precision: z.number().finite().min(0.000000001).max(1)
});

const streetCardCounts: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

export function cardKey(card: { rank: string; suit: string }): string {
  return `${card.rank}${card.suit}`;
}

export function validateEquityRequest(input: unknown): EquityAnalysisRequest {
  const parsed = equityRequestSchema.safeParse(input);
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_CARD_STATE', parsed.error.issues[0]?.message ?? 'Invalid equity request');
  }
  const expected = streetCardCounts[parsed.data.street];
  if (parsed.data.board.length !== expected) {
    throw new ApiError(400, 'INVALID_CARD_STATE', `${parsed.data.street} requires ${expected} board cards`);
  }
  const cards = parsed.data.board.flatMap((card) => [cardKey(card)]);
  for (const participant of parsed.data.participants) {
    const holdings = participant.holding ? [participant.holding.cards] : [];
    for (const combo of holdings) {
      for (const card of combo) {
        const key = cardKey(card);
        if (cards.includes(key)) throw new ApiError(400, 'INVALID_CARD_STATE', `Duplicate card ${key}`);
        cards.push(key);
      }
      if (new Set(combo.map(cardKey)).size !== combo.length) {
        throw new ApiError(400, 'INVALID_CARD_STATE', 'A holding cannot contain duplicate cards');
      }
      cards.splice(cards.length - combo.length, combo.length);
    }
    for (const combo of participant.range?.combos ?? []) {
      if (new Set(combo.cards.map(cardKey)).size !== combo.cards.length) {
        throw new ApiError(400, 'INVALID_RANGE', 'A combo cannot contain duplicate cards');
      }
    }
  }
  if (new Set(cards).size !== cards.length) throw new ApiError(400, 'INVALID_CARD_STATE', 'Duplicate cards are not allowed');
  return parsed.data as EquityAnalysisRequest;
}
