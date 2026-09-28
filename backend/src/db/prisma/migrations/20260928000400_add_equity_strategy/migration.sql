-- Feature 007: immutable strategy datasets and evaluation snapshots
CREATE TYPE "StrategyDatasetStatus" AS ENUM ('PUBLISHED', 'RETIRED');

CREATE TABLE "strategy_dataset_versions" (
  "id" TEXT NOT NULL,
  "version" TEXT NOT NULL,
  "schemaVersion" TEXT NOT NULL,
  "gameFormat" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "tableSize" INTEGER NOT NULL,
  "stackAssumptions" JSONB NOT NULL,
  "blindAssumptions" JSONB NOT NULL,
  "source" TEXT NOT NULL,
  "contentHash" TEXT,
  "assumptions" JSONB NOT NULL,
  "precision" DECIMAL(12,10) NOT NULL,
  "status" "StrategyDatasetStatus" NOT NULL DEFAULT 'PUBLISHED',
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "retiredAt" TIMESTAMP(3),
  CONSTRAINT "strategy_dataset_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "strategy_dataset_versions_version_key" ON "strategy_dataset_versions"("version");
CREATE INDEX "strategy_dataset_versions_gameFormat_street_status_idx" ON "strategy_dataset_versions"("gameFormat", "street", "status");

CREATE TABLE "strategy_rows" (
  "id" TEXT NOT NULL,
  "datasetVersionId" TEXT NOT NULL,
  "contextKey" TEXT NOT NULL,
  "rangeSnapshot" JSONB,
  "actions" JSONB NOT NULL,
  "factors" JSONB NOT NULL,
  "assumptions" JSONB NOT NULL,
  "conditions" JSONB NOT NULL,
  CONSTRAINT "strategy_rows_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "strategy_rows_datasetVersionId_contextKey_key" ON "strategy_rows"("datasetVersionId", "contextKey");

CREATE TABLE "evaluation_snapshots" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "scenarioId" TEXT,
  "datasetVersionId" TEXT,
  "contextSnapshot" JSONB NOT NULL,
  "equitySnapshot" JSONB NOT NULL,
  "strategyVersionSnapshot" JSONB,
  "strategyRowSnapshot" JSONB,
  "classification" TEXT,
  "availability" TEXT NOT NULL,
  "calculationFingerprint" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evaluation_snapshots_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "evaluation_snapshots_userId_createdAt_idx" ON "evaluation_snapshots"("userId", "createdAt");
CREATE INDEX "evaluation_snapshots_scenarioId_createdAt_idx" ON "evaluation_snapshots"("scenarioId", "createdAt");

ALTER TABLE "strategy_rows" ADD CONSTRAINT "strategy_rows_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "strategy_dataset_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_snapshots" ADD CONSTRAINT "evaluation_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evaluation_snapshots" ADD CONSTRAINT "evaluation_snapshots_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "strategy_dataset_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
