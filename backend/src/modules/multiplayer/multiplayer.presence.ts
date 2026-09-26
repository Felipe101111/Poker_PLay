export const DISCONNECT_GRACE_MS = 60_000;

export interface PresenceClock {
  now(): Date;
}

export const systemPresenceClock: PresenceClock = {
  now: () => new Date()
};
