import { prisma } from '../../db/prisma/client.js';

// Queries connect-pg-simple's own "session" table directly (see app.ts) — the
// friends module must not know this storage detail, so it only calls this function.
export async function isUserOnline(userId: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT COUNT(*)::bigint AS count FROM "session" WHERE (sess->>'userId') = $1 AND expire > now()`,
    userId
  );
  return Number(rows[0]?.count ?? 0) > 0;
}
