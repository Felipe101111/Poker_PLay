import { useEffect, useState, type FormEvent } from 'react';
import { friendsApi, type FriendSearchResult, type Friend, type FriendRequestsList } from '../services/friendsApi';
import { ApiRequestError } from '../services/apiClient';

export function FriendsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendSearchResult[]>([]);
  const [requests, setRequests] = useState<FriendRequestsList>({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState<Friend[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [requestsList, friendsList] = await Promise.all([
      friendsApi.listRequests(),
      friendsApi.listFriends()
    ]);
    setRequests(requestsList);
    setFriends(friendsList);
  }

  useEffect(() => {
    refresh().catch(() => setError('Could not load your friends data.'));
  }, []);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      setResults(await friendsApi.search(query));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Search failed.');
    }
  }

  async function handleSendRequest(receiverId: string) {
    setError(null);
    try {
      await friendsApi.sendRequest(receiverId);
      await refresh();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not send request.');
    }
  }

  async function handleAccept(requestId: string) {
    await friendsApi.accept(requestId);
    await refresh();
  }

  async function handleReject(requestId: string) {
    await friendsApi.reject(requestId);
    await refresh();
  }

  async function handleCancel(requestId: string) {
    await friendsApi.cancelRequest(requestId);
    await refresh();
  }

  async function handleRemove(friendId: string) {
    await friendsApi.removeFriend(friendId);
    await refresh();
  }

  return (
    <div>
      <h1>Friends</h1>
      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Find players</h2>
        <form onSubmit={handleSearch}>
          <label htmlFor="query">Username</label>
          <input id="query" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit">Search</button>
        </form>
        <ul>
          {results.map((r) => (
            <li key={r.id}>
              {r.username}
              <button type="button" onClick={() => handleSendRequest(r.id)}>
                Add friend
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Incoming requests</h2>
        <ul>
          {requests.incoming.map((r) => (
            <li key={r.id}>
              {r.senderUsername}
              <button type="button" onClick={() => handleAccept(r.id)}>
                Accept
              </button>
              <button type="button" onClick={() => handleReject(r.id)}>
                Reject
              </button>
            </li>
          ))}
        </ul>

        <h2>Sent requests</h2>
        <ul>
          {requests.outgoing.map((r) => (
            <li key={r.id}>
              {r.receiverUsername} (pending)
              <button type="button" onClick={() => handleCancel(r.id)}>
                Cancel
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Your friends</h2>
        <ul>
          {friends.map((f) => (
            <li key={f.id}>
              {f.username} — {f.online ? 'Online' : 'Offline'}
              <button type="button" onClick={() => handleRemove(f.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
