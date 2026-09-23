import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient, ApiRequestError } from '../services/apiClient';

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/api/auth/register', { email, username, password });
      navigate('/login');
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create your account</h1>
      {error && <p role="alert">{error}</p>}
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

      <label htmlFor="username">Username</label>
      <input
        id="username"
        type="text"
        required
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <p>Password must be at least 8 characters long.</p>

      <button type="submit" disabled={submitting}>
        Register
      </button>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </form>
  );
}
