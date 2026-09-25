export function normalizePair(userIdA: string, userIdB: string): { userLowId: string; userHighId: string } {
  return userIdA < userIdB
    ? { userLowId: userIdA, userHighId: userIdB }
    : { userLowId: userIdB, userHighId: userIdA };
}
