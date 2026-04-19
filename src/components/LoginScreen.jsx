import { useState } from 'react';
import { sendMagicLink } from '../auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const trimmed = email.trim();
    if (!trimmed) return setError('Enter your email');
    setSending(true);
    try {
      await sendMagicLink(trimmed);
      setSentTo(trimmed);
    } catch (err) {
      setError(err?.message || 'Could not send magic link');
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="login-screen">
        <div className="login-card">
          <h1>Check your email</h1>
          <p>
            We sent a sign-in link to <strong>{sentTo}</strong>. Click it on this device to
            continue.
          </p>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setSentTo('');
              setEmail('');
            }}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>Finance Tracker</h1>
        <p className="login-sub">Sign in with a magic link — no password needed.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
          {error && <div className="error">{error}</div>}
          <button type="submit" className="primary" disabled={sending}>
            {sending ? 'Sending…' : 'Send magic link'}
          </button>
        </form>
        <p className="hint">
          Your entries sync across any device where you sign in with the same email.
        </p>
      </div>
    </div>
  );
}
