import { Router } from 'express';
import { requireAuth } from '../auth/auth.middleware.js';
import { startHandSchema, asSeatQuerySchema, submitActionSchema } from './local-games.validation.js';
import { startHand, submitAction } from '../../poker-engine/engine.js';
import { computeLegalActions } from '../../poker-engine/betting.js';
import { handStore } from './hand-store.js';
import { toHandStateView, getActiveHandOrThrow, assertSeatExists, abandonHand } from './local-games.service.js';
import { ApiError } from '../../shared/errors.js';

export const localGamesRouter = Router();

localGamesRouter.use(requireAuth);

localGamesRouter.post('/', (req, res, next) => {
  const parsed = startHandSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }

  const userId = req.session.userId!;
  if (handStore.has(userId)) {
    next(new ApiError(409, 'HAND_IN_PROGRESS', 'You already have an active local hand'));
    return;
  }

  try {
    const hand = startHand(userId, parsed.data.seatCount, parsed.data.startingStackBB);
    handStore.set(userId, hand);
    res.status(201).json(toHandStateView(hand, 1, computeLegalActions(hand)));
  } catch (err) {
    next(err);
  }
});

localGamesRouter.get('/current', (req, res, next) => {
  const parsed = asSeatQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid asSeat'));
    return;
  }

  try {
    const hand = getActiveHandOrThrow(req.session.userId!);
    assertSeatExists(hand, parsed.data.asSeat);
    res.status(200).json(toHandStateView(hand, parsed.data.asSeat, computeLegalActions(hand)));
  } catch (err) {
    next(err);
  }
});

localGamesRouter.post('/current/actions', (req, res, next) => {
  const parsed = submitActionSchema.safeParse(req.body);
  if (!parsed.success) {
    next(new ApiError(400, 'VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid input'));
    return;
  }

  try {
    const hand = getActiveHandOrThrow(req.session.userId!);
    const actingSeat = parsed.data.seatNumber;
    submitAction(hand, {
      seatNumber: actingSeat,
      type: parsed.data.type,
      amount: parsed.data.amount ?? null,
      bettingRound: hand.bettingRound as never
    });
    res.status(200).json(toHandStateView(hand, actingSeat, computeLegalActions(hand)));
  } catch (err) {
    next(err);
  }
});

localGamesRouter.delete('/current', (req, res, next) => {
  try {
    abandonHand(req.session.userId!);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

