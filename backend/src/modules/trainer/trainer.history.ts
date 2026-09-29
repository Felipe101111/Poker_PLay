import type { TerminalHandSnapshot } from '../hand-history/hand-history.types.js';
import { publishTerminalHand } from '../hand-history/hand-history.publisher.js';

export function publishTrainerHistory(snapshot: Omit<TerminalHandSnapshot, 'sourceType'>) {
  return publishTerminalHand({ ...snapshot, sourceType: 'TRAINER' });
}