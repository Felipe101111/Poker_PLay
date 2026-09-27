export const DISCONNECT_GRACE_MS = 60_000;

export interface PresenceClock {
  now(): Date;
}

export const systemPresenceClock: PresenceClock = {
  now: () => new Date()
};

export function isGraceExpired(disconnectedAt: Date, now: Date): boolean {
  return now.getTime() - disconnectedAt.getTime() >= DISCONNECT_GRACE_MS;
}

export interface ActingSeatPresence {
  disconnectedAt: Date | null;
  seatNumber: number;
  actingSeat: number | null;
}

export function shouldAutoFoldDisconnectedActingSeat(presence: ActingSeatPresence, now: Date): boolean {
  return presence.disconnectedAt !== null && presence.actingSeat === presence.seatNumber && isGraceExpired(presence.disconnectedAt, now);
}
