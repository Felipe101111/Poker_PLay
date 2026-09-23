import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiClient, ApiRequestError } from '../services/apiClient';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiClient.post('/api/auth/login', { email, password });
      navigate('/profile');
    } catch (err) {
      // Generic message regardless of cause (FR-007/SC-004) — the server already
      // returns the same INVALID_CREDENTIALS code/message for both cases.
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
      <h1>Log in</h1>
      {error && <p role="alert">{error}</p>}
      <label htmlFor="email">Email</label>
      <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

      <label htmlFor="password">Password</label>
      <input
        id="password"
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button type="submit" disabled={submitting}>
        Log in
      </button>
      <p>
        Need an account? <Link to="/register">Register</Link>
      </p>
    </form>
  );
}
