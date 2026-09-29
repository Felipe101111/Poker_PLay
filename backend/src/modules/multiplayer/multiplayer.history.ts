import type { TerminalHandSnapshot } from '../hand-history/hand-history.types.js';
import { publishTerminalHand } from '../hand-history/hand-history.publisher.js';

export function publishMultiplayerHistory(snapshot: Omit<TerminalHandSnapshot, 'sourceType'>) {
  return publishTerminalHand({ ...snapshot, sourceType: 'MULTIPLAYER' });
}