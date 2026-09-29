import type { TerminalHandSnapshot } from '../hand-history/hand-history.types.js';
import { publishTerminalHand } from '../hand-history/hand-history.publisher.js';

export function publishLocalGameHistory(snapshot: Omit<TerminalHandSnapshot, 'sourceType'>) {
  return publishTerminalHand({ ...snapshot, sourceType: 'LOCAL_GAME' });
}