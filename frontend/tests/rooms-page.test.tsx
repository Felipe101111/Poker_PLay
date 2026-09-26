import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoomsPage } from '../src/pages/RoomsPage';

function response(body: unknown, status = 200) {
  return Promise.resolve({ ok: status < 400, status, json: () => Promise.resolve(body) });
}

describe('RoomsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('loads public rooms and creates a room through the API', async () => {
    const room = {
      id: 'room-1', name: 'Open Table', visibility: 'PUBLIC', status: 'WAITING', hostId: 'user-1', hostUsername: 'Host',
      seatLimit: 6, minPlayers: 2, startingStackBB: 100, smallBlind: 1, bigBlind: 2, occupiedSeats: 1, availableSeats: 5,
      createdAt: new Date().toISOString(), members: [{ userId: 'user-1', username: 'Host', seatNumber: 1, ready: false, isHost: true }]
    };
    const fetchMock = vi.spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => response({ rooms: [room] }))
      .mockImplementationOnce(() => response({ invitations: [] }))
      .mockImplementationOnce(() => response({ id: 'user-1' }))
      .mockImplementationOnce(() => response(room, 201))
      .mockImplementationOnce(() => response({ rooms: [room] }))
      .mockImplementationOnce(() => response({ invitations: [] }));

    render(<RoomsPage />);
    expect(await screen.findByText('Open Table')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'New Table' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create room' }));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Room created.'));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/api/rooms'), expect.objectContaining({ method: 'POST' }));
  });
});
