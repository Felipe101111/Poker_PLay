import { useEffect, useState, type FormEvent } from 'react';
import { apiClient, ApiRequestError } from '../services/apiClient';
import { roomsApi, type CreateRoomInput, type RoomInvitation, type RoomView } from '../services/roomsApi';
import { Link } from 'react-router-dom';

const initialForm: CreateRoomInput = {
  name: '',
  visibility: 'PUBLIC',
  seatLimit: 6,
  minPlayers: 2,
  startingStackBB: 100,
  smallBlind: 1,
  bigBlind: 2
};

export function RoomsPage() {
  const [rooms, setRooms] = useState<RoomView[]>([]);
  const [selected, setSelected] = useState<RoomView | null>(null);
  const [invitations, setInvitations] = useState<RoomInvitation[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [form, setForm] = useState(initialForm);
  const [inviteUserId, setInviteUserId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function refresh() {
    const [roomList, invitationList] = await Promise.all([roomsApi.list(), roomsApi.listInvitations()]);
    setRooms(roomList.rooms);
    setInvitations(invitationList.invitations);
  }

  useEffect(() => {
    Promise.all([refresh(), apiClient.get<{ id: string }>('/api/users/me')])
      .then(([, profile]) => setCurrentUserId(profile.id))
      .catch((err) => setError(getError(err, 'Could not load rooms.')));
  }, []);

  async function showRoom(roomId: string) {
    try {
      setSelected(await roomsApi.get(roomId));
      setError(null);
    } catch (err) {
      setError(getError(err, 'Could not load that room.'));
    }
  }

  async function createRoom(event: FormEvent) {
    event.preventDefault();
    try {
      const room = await roomsApi.create(form);
      setSelected(room);
      setMessage('Room created.');
      await refresh();
    } catch (err) {
      setError(getError(err, 'Could not create the room.'));
    }
  }

  async function run(action: () => Promise<unknown>, success?: string) {
    try {
      await action();
      if (success) setMessage(success);
      await refresh();
      if (selected) await showRoom(selected.id);
    } catch (err) {
      setError(getError(err, 'Room action failed.'));
    }
  }

  const currentMember = selected?.members?.find((member) => member.userId === currentUserId);
  const currentUserIsHost = currentMember?.isHost ?? false;

  return (
    <main>
      <h1>Poker rooms</h1>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <section>
        <h2>Create a room</h2>
        <form onSubmit={createRoom}>
          <label>Name <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required /></label>
          <label>Visibility <select value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as CreateRoomInput['visibility'] })}><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option></select></label>
          <label>Seats <input type="number" min="2" max="9" value={form.seatLimit} onChange={(event) => setForm({ ...form, seatLimit: Number(event.target.value) })} /></label>
          <label>Minimum players <input type="number" min="2" max={form.seatLimit} value={form.minPlayers} onChange={(event) => setForm({ ...form, minPlayers: Number(event.target.value) })} /></label>
          <label>Starting stack BB <input type="number" min="1" value={form.startingStackBB} onChange={(event) => setForm({ ...form, startingStackBB: Number(event.target.value) })} /></label>
          <label>Small blind <input type="number" min="1" value={form.smallBlind} onChange={(event) => setForm({ ...form, smallBlind: Number(event.target.value) })} /></label>
          <label>Big blind <input type="number" min="1" value={form.bigBlind} onChange={(event) => setForm({ ...form, bigBlind: Number(event.target.value) })} /></label>
          <button type="submit">Create room</button>
        </form>
      </section>

      <section>
        <h2>Available rooms</h2>
        <button type="button" onClick={() => refresh().catch((err) => setError(getError(err, 'Could not refresh rooms.')))}>Refresh</button>
        {rooms.length === 0 ? <p>No public waiting rooms.</p> : <ul>{rooms.map((room) => <li key={room.id}><strong>{room.name}</strong> ({room.occupiedSeats}/{room.seatLimit}) <button type="button" onClick={() => showRoom(room.id)}>View</button><button type="button" onClick={() => run(() => roomsApi.join(room.id), 'Joined room.')}>Join</button></li>)}</ul>}
      </section>

      <section>
        <h2>Invitations</h2>
        {invitations.length === 0 ? <p>No pending invitations.</p> : <ul>{invitations.map((invitation) => <li key={invitation.id}>{invitation.fromUsername} invited you to {invitation.roomName}. <button type="button" onClick={() => run(() => roomsApi.acceptInvitation(invitation.id), 'Invitation accepted.')}>Accept</button><button type="button" onClick={() => run(() => roomsApi.declineInvitation(invitation.id), 'Invitation declined.')}>Decline</button></li>)}</ul>}
      </section>

      {selected && <section>
        <h2>{selected.name}</h2>
        <p>{selected.status} · Host: {selected.hostUsername} · Seats: {selected.occupiedSeats}/{selected.seatLimit}</p>
        <ul>{selected.members?.map((member) => <li key={member.userId}>{member.username} · seat {member.seatNumber} · {member.ready ? 'Ready' : 'Not ready'}{member.isHost ? ' · Host' : ''}</li>)}</ul>
        {selected.status === 'WAITING' && <>
          {currentMember && <button type="button" onClick={() => run(() => roomsApi.setReadiness(selected.id, !currentMember.ready), 'Readiness updated.')}>Toggle readiness</button>}
          <button type="button" onClick={() => run(() => roomsApi.leave(selected.id), 'Left room.')}>Leave</button>
          {currentUserIsHost && <>
            <form onSubmit={(event) => { event.preventDefault(); run(() => roomsApi.invite(selected.id, inviteUserId), 'Invitation sent.'); }}><input aria-label="Friend user id" value={inviteUserId} onChange={(event) => setInviteUserId(event.target.value)} placeholder="Friend user id" required /><button type="submit">Invite friend</button></form>
            <button type="button" onClick={() => run(() => roomsApi.start(selected.id), 'Room started.')}>Start room</button>
            <button type="button" onClick={() => run(() => roomsApi.close(selected.id), 'Room closed.')}>Close room</button>
          </>}
        </>}
        <p>{currentMember ? 'You are a member of this room.' : 'Room details are limited until you join.'}</p>
        {selected.status === 'STARTED' && currentMember && <Link to={`/rooms/${selected.id}/table`}>Open live table</Link>}
      </section>}
    </main>
  );
}

function getError(error: unknown, fallback: string) {
  return error instanceof ApiRequestError ? error.message : fallback;
}
