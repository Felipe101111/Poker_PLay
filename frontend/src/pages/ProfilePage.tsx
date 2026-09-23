import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient, ApiRequestError } from '../services/apiClient';

interface Profile {
  id: string;
  email: string;
  username: string;
  createdAt: string;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .get<Profile>('/api/users/me')
      .then((data) => {
        setProfile(data);
        setUsername(data.username);
      })
      .catch(() => navigate('/login'));
  }, [navigate]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const updated = await apiClient.patch<Profile>('/api/users/me', { username });
      setProfile(updated);
      setMessage('Profile updated.');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Something went wrong.');
    }
  }

  async function handleLogout() {
    await apiClient.post('/api/auth/logout');
    navigate('/login');
  }

  if (!profile) {
    return <p>Loading profile…</p>;
  }

  return (
    <div>
      <h1>Your profile</h1>
      <p>Email: {profile.email}</p>
      <p>Member since: {new Date(profile.createdAt).toLocaleDateString()}</p>

      <form onSubmit={handleSave}>
        {error && <p role="alert">{error}</p>}
        {message && <p>{message}</p>}
        <label htmlFor="username">Username (also your display name)</label>
        <input
          id="username"
          type="text"
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button type="submit">Save</button>
      </form>

      <button type="button" onClick={handleLogout}>
        Log out
      </button>
    </div>
  );
}
