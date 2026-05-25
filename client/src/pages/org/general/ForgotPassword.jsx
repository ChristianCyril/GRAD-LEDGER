import { useState } from 'react';
import { Link } from 'react-router-dom';
import {api} from '../../../api/axios';
import './AuthForm.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/forgot-password', { email: email.trim() });
      setSubmitted(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo__mark">⬡</span>
          <span className="auth-logo__text">Grad-Ledger</span>
        </div>

        {submitted ? (
          /* ── Success state ── */
          <div className="auth-success">
            <div className="auth-success__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="auth-card__title">Check your inbox</h1>
            <p className="auth-card__sub">
              If an account exists for <strong>{email}</strong>, a password
              reset link has been sent. Check your spam folder if you don't
              see it within a few minutes.
            </p>
            <Link to="/org-login" className="auth-back-link">
              ← Back to sign in
            </Link>
          </div>
        ) : (
          /* ── Form state ── */
          <>
            <div className="auth-card__header">
              <h1 className="auth-card__title">Forgot password</h1>
              <p className="auth-card__sub">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <div className="field">
                <label className="field__label" htmlFor="email">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  className="field__input"
                  placeholder="you@institution.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError('');
                  }}
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="auth-error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}

              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    Sending…
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <Link to="/org-login" className="auth-back-link">
              ← Back to sign in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}