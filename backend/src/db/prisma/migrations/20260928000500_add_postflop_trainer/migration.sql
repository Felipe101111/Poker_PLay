ALTER TYPE "TrainingSessionFormat" ADD VALUE 'SIX_MAX_100BB_POSTFLOP';

CREATE TYPE "TrainingStreet" AS ENUM ('FLOP', 'TURN', 'RIVER');
CREATE TYPE "TrainingTerminalReason" AS ENUM ('FOLD', 'ALL_IN', 'SHOWDOWN', 'COMPLETE');

ALTER TABLE "training_scenarios"
  ADD COLUMN "street" "TrainingStreet",
  ADD COLUMN "board" JSONB,
  ADD COLUMN "potBB" DOUBLE PRECISION,
  ADD COLUMN "terminalReason" "TrainingTerminalReason";