import type { TerminalHandSnapshot } from './hand-history.types.js';
import { handHistoryService } from './hand-history.service.js';

export function publishTerminalHand(snapshot: TerminalHandSnapshot) {
  return handHistoryService.publish(snapshot);
}