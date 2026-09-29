import type { Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma/client.js';
import type { AnalyticsFilter, HandHistoryQuery, TerminalHandSnapshot } from './hand-history.types.js';
import { queryFilters } from './hand-history.projection.js';

const includes = { participants: true, actions: { orderBy: { sequence: 'asc' as const } }, policies: true } as const;

export async function publishTerminal(snapshot: TerminalHandSnapshot, db = prisma) {
  const existing = await db.handHistory.findUnique({ where: { sourceType_sourceId: { sourceType: snapshot.sourceType, sourceId: snapshot.sourceId } }, include: includes });
  if (existing) return { history: existing, duplicate: true };
  try {
    const created = await db.handHistory.create({
      data: {
        sourceType: snapshot.sourceType,
        sourceId: snapshot.sourceId,
        status: snapshot.status,
        format: snapshot.format,
        startedAt: new Date(snapshot.startedAt),
        endedAt: new Date(snapshot.endedAt),
        sequenceVersion: snapshot.sequenceVersion ?? 1,
        publicSnapshot: snapshot.publicSnapshot,
        participants: { create: snapshot.participants.map((participant) => ({ userId: participant.userId ?? null, seatNumber: participant.seatNumber, displayNameSnapshot: participant.displayName ?? null, role: participant.role ?? 'PLAYER', visibility: participant.visibility ?? 'PARTICIPANT' })) },
        actions: { create: snapshot.actions.map((action) => ({ sequence: action.sequence, street: action.street, seatNumber: action.seatNumber ?? null, actionType: action.actionType, amount: action.amount ?? null, publicStateAfter: action.publicStateAfter ?? {}, occurredAt: new Date(action.occurredAt) })) },
        policies: { create: snapshot.participants.filter((participant) => participant.userId).map((participant) => ({ userId: participant.userId!, canList: true, canViewDetail: true, canRequestRemoval: true, redactionProfile: 'FULL_AUTHORIZED' })) }
      },
      include: includes
    });
    return { history: created, duplicate: false };
  } catch (error) {
    if ((error as { code?: string }).code !== 'P2002') throw error;
    const duplicate = await db.handHistory.findUnique({ where: { sourceType_sourceId: { sourceType: snapshot.sourceType, sourceId: snapshot.sourceId } }, include: includes });
    if (!duplicate) throw error;
    return { history: duplicate, duplicate: true };
  }
}

export async function listForUser(userId: string, query: HandHistoryQuery, db = prisma) {
  const where = queryFilters(query, userId) as Prisma.HandHistoryWhereInput;
  const [items, total] = await db.$transaction([
    db.handHistory.findMany({ where, include: includes, orderBy: [{ endedAt: query.direction }, { id: query.direction }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
    db.handHistory.count({ where })
  ]);
  return { items, total };
}

export async function findForUser(historyId: string, userId: string, db = prisma) {
  return db.handHistory.findFirst({ where: { id: historyId, policies: { some: { userId, canViewDetail: true } } }, include: includes });
}

export async function findForReplay(historyId: string, userId: string, db = prisma) {
  return db.handHistory.findFirst({ where: { id: historyId, status: { in: ['COMPLETED', 'FOLDED', 'ALL_IN', 'ABANDONED', 'ANONYMIZED'] }, policies: { some: { userId, canViewDetail: true } } }, include: includes });
}

export async function removeUserPolicy(historyId: string, userId: string, db = prisma) {
  const result = await db.historyAccessPolicy.updateMany({ where: { historyId, userId, canRequestRemoval: true }, data: { canList: false, canViewDetail: false, canRequestRemoval: false, redactionProfile: 'ANONYMIZED', anonymizedAt: new Date() } });
  if (result.count > 0) return result;
  return db.historyAccessPolicy.findFirst({ where: { historyId, userId, redactionProfile: 'ANONYMIZED' } });
}

export async function listAnalyticsForUser(userId: string, filter: AnalyticsFilter, db = prisma) {
  const where = queryFilters({ ...filter, page: 1, pageSize: 100000, sort: 'endedAt', direction: 'asc' }, userId) as Prisma.HandHistoryWhereInput;
  const items = await db.handHistory.findMany({
    where,
    include: includes,
    orderBy: [{ endedAt: 'asc' }, { id: 'asc' }]
  });
  return items.filter((item) => ['COMPLETED', 'FOLDED', 'ALL_IN', 'ABANDONED', 'ANONYMIZED'].includes(item.status));
}