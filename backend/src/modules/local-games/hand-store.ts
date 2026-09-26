import type { HandState } from '../../poker-engine/types.js';

// In-memory, single-process store: at most one active hand per user (FR-012).
// Not persisted — explicitly out of scope for this feature (spec.md Assumptions).
const activeHands = new Map<string, HandState>();

export const handStore = {
  get(userId: string): HandState | undefined {
    return activeHands.get(userId);
  },
  set(userId: string, hand: HandState): void {
    activeHands.set(userId, hand);
  },
  delete(userId: string): void {
    activeHands.delete(userId);
  },
  has(userId: string): boolean {
    return activeHands.has(userId);
  }
};
