import { MultiplayerHandStatus } from '@prisma/client';
import { computeLegalActions } from '../../poker-engine/betting.js';
import type { HandState } from '../../poker-engine/types.js';
import type { TableView } from './multiplayer.types.js';
import type { TableWithDetails } from './multiplayer.repository.js';
import { readHandState } from './multiplayer.repository.js';

export function projectTable(table: TableWithDetails, viewerUserId: string): TableView {
  const viewer = table.participants.find((participant) => participant.userId === viewerUserId);
  const handRecord = table.currentHand;
  const hand = handRecord ? readHandState(handRecord.stateSnapshot) : null;
  const revealedSeats = new Set(hand?.result?.revealedSeats ?? []);

  return {
    id: table.id,
    roomId: table.roomId,
    status: table.status,
    handNumber: table.handNumber,
    stateVersion: table.stateVersion,
    dealerSeat: table.dealerSeat,
    currentHand: handRecord && hand
      ? {
          id: handRecord.id,
          status: handRecord.status,
          street: hand.bettingRound,
          board: hand.communityCards,
          pot: hand.seats.reduce((sum, seat) => sum + seat.totalContribution, 0),
          actingSeat: hand.seatToAct,
          legalActions: viewer && hand.seatToAct === viewer.seatNumber ? computeLegalActions(hand) : null,
          privateCards: viewer ? hand.seats.find((seat) => seat.seatNumber === viewer.seatNumber)?.holeCards ?? [] : [],
          players: table.participants.map((participant) => {
            const seat = hand.seats.find((item) => item.seatNumber === participant.seatNumber);
            const canReveal = participant.userId === viewerUserId || (seat ? revealedSeats.has(seat.seatNumber) : false);
            return {
              userId: participant.userId,
              username: participant.user.username,
              seatNumber: participant.seatNumber,
              stack: seat?.stack ?? participant.stack,
              connectionStatus: participant.connectionStatus,
              folded: seat?.folded ?? false,
              isAllIn: seat?.isAllIn ?? false,
              eliminated: !participant.eligibleForNextHand,
              streetContribution: seat?.streetContribution ?? 0,
              totalContribution: seat?.totalContribution ?? 0,
              holeCards: canReveal ? seat?.holeCards ?? null : null
            };
          })
        }
      : null
  };
}

export function isCompletedHand(table: TableWithDetails): boolean {
  return table.currentHand?.status === MultiplayerHandStatus.COMPLETED;
}
