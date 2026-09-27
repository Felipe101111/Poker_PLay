CREATE TYPE "TrainingSessionFormat" AS ENUM ('SIX_MAX_100BB_PREFLOP');
CREATE TYPE "TrainingSessionStatus" AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE "TrainingEvaluationStatus" AS ENUM ('EVALUATED', 'UNAVAILABLE');
CREATE TYPE "TrainingEvaluationCategory" AS ENUM ('PREFERRED', 'ACCEPTABLE_MIXED', 'MARGINAL', 'SIGNIFICANT_DEVIATION');

CREATE TABLE "training_sessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "format" "TrainingSessionFormat" NOT NULL DEFAULT 'SIX_MAX_100BB_PREFLOP',
  "status" "TrainingSessionStatus" NOT NULL DEFAULT 'ACTIVE',
  "currentScenarioId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "training_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_scenarios" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "generationSeed" INTEGER NOT NULL,
  "engineSnapshot" JSONB NOT NULL,
  "holeCards" JSONB NOT NULL,
  "position" TEXT NOT NULL,
  "tableSize" INTEGER NOT NULL,
  "effectiveStackBB" INTEGER NOT NULL,
  "blindContext" JSONB NOT NULL,
  "priorActions" JSONB NOT NULL,
  "legalActions" JSONB NOT NULL,
  "strategyKey" TEXT NOT NULL,
  "strategyVersion" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "training_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "training_decisions" (
  "id" TEXT NOT NULL,
  "scenarioId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "selectedAction" JSONB NOT NULL,
  "evaluationStatus" "TrainingEvaluationStatus" NOT NULL,
  "category" "TrainingEvaluationCategory",
  "recommendationSnapshot" JSONB,
  "explanationSnapshot" JSONB NOT NULL,
  "strategyVersion" TEXT,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "requestId" TEXT NOT NULL,
  CONSTRAINT "training_decisions_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_scenarios" ADD CONSTRAINT "training_scenarios_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "training_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_decisions" ADD CONSTRAINT "training_decisions_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "training_scenarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_decisions" ADD CONSTRAINT "training_decisions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "training_sessions" ADD CONSTRAINT "training_sessions_currentScenarioId_fkey" FOREIGN KEY ("currentScenarioId") REFERENCES "training_scenarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "training_sessions_currentScenarioId_key" ON "training_sessions"("currentScenarioId");
CREATE UNIQUE INDEX "training_scenarios_sessionId_sequence_key" ON "training_scenarios"("sessionId", "sequence");
CREATE UNIQUE INDEX "training_decisions_scenarioId_userId_key" ON "training_decisions"("scenarioId", "userId");
CREATE UNIQUE INDEX "training_decisions_scenarioId_userId_requestId_key" ON "training_decisions"("scenarioId", "userId", "requestId");
CREATE INDEX "training_sessions_userId_status_idx" ON "training_sessions"("userId", "status");
CREATE INDEX "training_scenarios_sessionId_createdAt_idx" ON "training_scenarios"("sessionId", "createdAt");
CREATE INDEX "training_decisions_userId_completedAt_idx" ON "training_decisions"("userId", "completedAt");
CREATE UNIQUE INDEX "training_sessions_one_active_per_user_idx" ON "training_sessions"("userId") WHERE "status" = 'ACTIVE';

ALTER TABLE "training_scenarios" ADD CONSTRAINT "training_scenarios_table_size_check" CHECK ("tableSize" = 6);
ALTER TABLE "training_scenarios" ADD CONSTRAINT "training_scenarios_effective_stack_check" CHECK ("effectiveStackBB" > 0);
