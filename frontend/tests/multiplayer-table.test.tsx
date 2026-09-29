import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MultiplayerTablePage } from '../src/pages/MultiplayerTablePage';

const socketHandlers: Record<string, (payload?: unknown) => void> = {};
const socket = {
  on: vi.fn((event: string, handler: (payload?: unknown) => void) => { socketHandlers[event] = handler; return socket; }),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn()
};

vi.mock('../src/services/multiplayerApi', () => ({
  multiplayerApi: {
    get: vi.fn(),
    reconnect: vi.fn(),
    action: vi.fn()
  },
  ApiRequestError: class ApiRequestError extends Error {}
}));
vi.mock('../src/services/multiplayerSocket', () => ({
  createMultiplayerSocket: () => socket,
  joinTable: vi.fn(),
  leaveTable: vi.fn(),
  sendTableAction: vi.fn(),
  sendTableHeartbeat: vi.fn()
}));

const { multiplayerApi } = await import('../src/services/multiplayerApi');

function renderPage() {
  return render(<MemoryRouter initialEntries={['/rooms/room-1/table']}>
    <Routes><Route path="/rooms/:roomId/table" element={<MultiplayerTablePage />} /></Routes>
  </MemoryRouter>);
}

describe('MultiplayerTablePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(socketHandlers)) delete socketHandlers[key];
    vi.mocked(multiplayerApi.get).mockResolvedValue({ table: {
      id: 'table-1', roomId: 'room-1', status: 'CLOSED', handNumber: 1, stateVersion: 2, dealerSeat: 1,
      lastCompletedHand: { id: 'hand-1', handNumber: 1, board: [], result: { potsAwarded: [{ amount: 20, eligibleSeats: [1], winners: [1] }], revealedSeats: [1], handRanks: {} } },
      currentHand: { id: 'hand-1', status: 'COMPLETED', street: 'complete', board: [], pot: 20, actingSeat: null, legalActions: null, privateCards: [], result: { potsAwarded: [{ amount: 20, eligibleSeats: [1], winners: [1] }], revealedSeats: [1], handRanks: {} }, players: [{ userId: 'user-1', username: 'Host', seatNumber: 1, stack: 120, connectionStatus: 'ONLINE', folded: false, isAllIn: false, eliminated: false, streetContribution: 0, totalContribution: 20, holeCards: null }]
      }
    } });
  });

  it('renders closure, result awards, status messaging, and keyboard-operable controls', async () => {
    renderPage();

    expect(await screen.findByText('This table is closed.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hand 1 result' })).toBeInTheDocument();
    expect(screen.getAllByText(/20 to 1/)).toHaveLength(2);
    await waitFor(() => expect(socket.on).toHaveBeenCalledWith('disconnect', expect.any(Function)));
  });

  it('requests a fresh snapshot after a stale event and exposes connection loss', async () => {
    vi.mocked(multiplayerApi.reconnect).mockResolvedValue({ table: {
      id: 'table-1', roomId: 'room-1', status: 'CLOSED', handNumber: 2, stateVersion: 3, dealerSeat: 1,
      lastCompletedHand: null, currentHand: null
    } });
    renderPage();
    await screen.findByText('This table is closed.');

    socketHandlers.disconnect?.();
    socketHandlers['table:error']?.({ code: 'STALE_GAME_STATE', message: 'stale' });

    await waitFor(() => expect(multiplayerApi.reconnect).toHaveBeenCalledWith('room-1', 0));
  });
});
