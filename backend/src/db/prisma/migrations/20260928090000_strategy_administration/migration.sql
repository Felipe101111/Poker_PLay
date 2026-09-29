-- Feature 012: strategy administration, editorial roles, drafts, and audit history
ALTER TYPE "StrategyDatasetStatus" ADD VALUE 'DRAFT';
CREATE TYPE "EditorialRole" AS ENUM ('USER', 'EDITOR', 'REVIEWER', 'PUBLISHER', 'ADMIN');

ALTER TABLE "users" ADD COLUMN "editorialRole" "EditorialRole" NOT NULL DEFAULT 'USER';

CREATE TABLE "strategy_datasets" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "strategy_datasets_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "strategy_datasets_key_key" ON "strategy_datasets"("key");

INSERT INTO "strategy_datasets" ("id", "key", "name", "description", "updatedAt")
VALUES ('legacy-strategy-dataset', 'legacy-strategy-dataset', 'Legacy strategy data', 'Imported from Feature 007 strategy versions', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;

ALTER TABLE "strategy_dataset_versions"
  ADD COLUMN "datasetId" TEXT,
  ADD COLUMN "compatibilityKey" TEXT,
  ADD COLUMN "activeCompatibilityKey" TEXT,
  ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "validationReport" JSONB,
  ADD COLUMN "createdById" TEXT,
  ADD COLUMN "publishedById" TEXT,
  ADD COLUMN "retiredById" TEXT,
  ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "strategy_dataset_versions"
SET "datasetId" = 'legacy-strategy-dataset',
    "compatibilityKey" = CONCAT('legacy:', "id"),
    "createdAt" = "publishedAt",
    "updatedAt" = "publishedAt"
WHERE "datasetId" IS NULL;

ALTER TABLE "strategy_dataset_versions"
  ALTER COLUMN "datasetId" SET NOT NULL,
  ALTER COLUMN "compatibilityKey" SET NOT NULL,
  ALTER COLUMN "publishedAt" DROP NOT NULL;

DROP INDEX "strategy_dataset_versions_version_key";
CREATE UNIQUE INDEX "strategy_dataset_versions_datasetId_version_key" ON "strategy_dataset_versions"("datasetId", "version");
CREATE UNIQUE INDEX "strategy_dataset_versions_activeCompatibilityKey_key" ON "strategy_dataset_versions"("activeCompatibilityKey");
CREATE INDEX "strategy_dataset_versions_datasetId_status_createdAt_idx" ON "strategy_dataset_versions"("datasetId", "status", "createdAt");
CREATE INDEX "strategy_dataset_versions_compatibilityKey_status_idx" ON "strategy_dataset_versions"("compatibilityKey", "status");

CREATE TABLE "strategy_publication_records" (
  "id" TEXT NOT NULL,
  "datasetVersionId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT,
  "previousActiveVersionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "strategy_publication_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "strategy_publication_records_datasetVersionId_createdAt_idx" ON "strategy_publication_records"("datasetVersionId", "createdAt");
CREATE INDEX "strategy_publication_records_actorId_createdAt_idx" ON "strategy_publication_records"("actorId", "createdAt");

CREATE TABLE "editorial_audit_entries" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "actorRole" "EditorialRole" NOT NULL,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "requestId" TEXT,
  "expectedRevision" INTEGER,
  "result" TEXT NOT NULL,
  "reason" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "editorial_audit_entries_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "editorial_audit_entries_entityType_entityId_createdAt_idx" ON "editorial_audit_entries"("entityType", "entityId", "createdAt");
CREATE INDEX "editorial_audit_entries_actorId_createdAt_idx" ON "editorial_audit_entries"("actorId", "createdAt");
CREATE INDEX "editorial_audit_entries_action_createdAt_idx" ON "editorial_audit_entries"("action", "createdAt");

ALTER TABLE "strategy_dataset_versions"
  ADD CONSTRAINT "strategy_dataset_versions_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "strategy_datasets"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "strategy_dataset_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "strategy_dataset_versions_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "strategy_dataset_versions_retiredById_fkey" FOREIGN KEY ("retiredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "strategy_publication_records"
  ADD CONSTRAINT "strategy_publication_records_datasetVersionId_fkey" FOREIGN KEY ("datasetVersionId") REFERENCES "strategy_dataset_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "strategy_publication_records_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "editorial_audit_entries"
  ADD CONSTRAINT "editorial_audit_entries_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
