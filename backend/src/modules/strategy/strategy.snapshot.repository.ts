import type { PrismaClient } from '@prisma/client';
import type { EvaluationSnapshot } from './strategy.types.js';

type SnapshotDb = Pick<PrismaClient, 'evaluationSnapshot'>;

export async function insertEvaluationSnapshot(snapshot: EvaluationSnapshot, userId: string, db: SnapshotDb): Promise<void> {
  await db.evaluationSnapshot.create({
    data: {
      id: snapshot.id,
      userId,
      scenarioId: snapshot.scenarioId,
      contextSnapshot: snapshot.contextSnapshot as never,
      equitySnapshot: snapshot.equitySnapshot as never,
      strategyVersionSnapshot: snapshot.strategyVersionSnapshot as never,
      strategyRowSnapshot: snapshot.strategyRowSnapshot as never,
      classification: snapshot.classification,
      availability: snapshot.availability,
      calculationFingerprint: snapshot.calculationFingerprint,
      createdAt: new Date(snapshot.createdAt)
    }
  });
}
