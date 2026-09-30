import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
  sendTableHeartbeat: vi.fn(),
  abandonTable: vi.fn()
}));

const { multiplayerApi } = await import('../src/services/multiplayerApi');
const { abandonTable, sendTableAction } = await import('../src/services/multiplayerSocket');

function renderPage() {
  return render(<MemoryRouter initialEntries={['/rooms/room-1/table']}>
    <Routes>
      <Route path="/rooms/:roomId/table" element={<MultiplayerTablePage />} />
      <Route path="/rooms" element={<p>Rooms destination</p>} />
    </Routes>
  </MemoryRouter>);
}

describe('MultiplayerTablePage', () => {
  afterEach(cleanup);

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

  it('renders private and community cards and submits bets from the visual controls', async () => {
    const response = await multiplayerApi.get('room-1');
    const currentHand = response.table.currentHand!;
    vi.mocked(multiplayerApi.get).mockResolvedValue({ table: {
      ...response.table, status: 'ACTIVE', lastCompletedHand: null,
      currentHand: {
        ...currentHand, status: 'ACTIVE', street: 'flop', actingSeat: 1, result: null,
        board: [{ rank: '9', suit: 'h' }],
        privateCards: [{ rank: 'A', suit: 's' }, { rank: 'K', suit: 's' }],
        legalActions: { seatNumber: 1, actions: ['fold', 'call', 'raise'], callAmount: 10, minBetOrRaise: 20, maxBetOrRaise: 120 }
      }
    } });
    renderPage();
    const cards = await screen.findByRole('group', { name: 'Your cards' });
    expect(within(cards).getByRole('img', { name: 'A of spades' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Community cards' })).getByRole('img', { name: '9 of hearts' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Call 10' })).toBeDisabled();
    act(() => socketHandlers.connect?.());
    expect(screen.getByRole('button', { name: 'raise' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Bet or raise amount'), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'raise' }));
    expect(sendTableAction).toHaveBeenCalledWith(socket, 'room-1', expect.objectContaining({ handId: 'hand-1', expectedVersion: 2, type: 'raise', amount: 40 }), expect.any(Function));
    act(() => socketHandlers.disconnect?.());
    expect(screen.getByRole('button', { name: 'raise' })).toBeDisabled();
  });

  it('navigates back to rooms and offers confirmed table abandonment', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.mocked(abandonTable).mockImplementation((_socket, _roomId, acknowledge) => acknowledge?.({ ok: true }));
    const page = renderPage();
    await screen.findByText('This table is closed.');

    act(() => socketHandlers.connect?.());
    fireEvent.click(screen.getByRole('button', { name: 'Back to rooms' }));
    expect(screen.getByText('Rooms destination')).toBeInTheDocument();
    page.unmount();

    const abandonPage = renderPage();
    await screen.findByText('This table is closed.');
    act(() => socketHandlers.connect?.());
    fireEvent.click(screen.getByRole('button', { name: 'Abandon game' }));

    expect(confirm).toHaveBeenCalled();
    expect(abandonTable).toHaveBeenCalledWith(socket, 'room-1', expect.any(Function));
    abandonPage.unmount();
    confirm.mockRestore();
  });
});
