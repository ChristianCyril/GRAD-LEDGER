import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {api} from '../../../api/axios';
import './AuthForm.css';

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;

  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const colorClass = ['', 'strength--weak', 'strength--fair', 'strength--good', 'strength--strong'][score];

  if (!password) return null;

  return (
    <div className="strength">
      <div className="strength__bars">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`strength__bar ${i < score ? colorClass : ''}`}
          />
        ))}
      </div>
      <span className={`strength__label ${colorClass}`}>{label}</span>
    </div>
  );
}

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';

  const [form, setForm] = useState({ newPassword: '', confirmPassword: '' });
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo__mark">⬡</span>
            <span className="auth-logo__text">Grad-Ledger</span>
          </div>
          <div className="auth-invalid">
            <div className="auth-invalid__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="auth-card__title">Invalid link</h1>
            <p className="auth-card__sub">
              This password reset link is missing or invalid. Please request a new one.
            </p>
            <Link to="/forgot-password" className="auth-btn auth-btn--inline">
              Request new link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  function validate() {
    const errors = {};
    if (!form.newPassword) {
      errors.newPassword = 'Please enter a new password.';
    } else if (form.newPassword.length < 8) {
      errors.newPassword = 'Password must be at least 8 characters.';
    }
    if (!form.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password.';
    } else if (form.newPassword !== form.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }
    return errors;
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validate();
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/api/auth/reset-password', {
        token,
        newPassword: form.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 400) {
        setError(msg ?? 'This reset link has expired or is invalid. Please request a new one.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <span className="auth-logo__mark">⬡</span>
            <span className="auth-logo__text">Grad-Ledger</span>
          </div>
          <div className="auth-success">
            <div className="auth-success__icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 12.5l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h1 className="auth-card__title">Password updated</h1>
            <p className="auth-card__sub">
              Your password has been reset successfully. You can now sign in
              with your new password.
            </p>
            <button
              className="auth-btn"
              onClick={() => navigate('/org-login')}
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* Logo */}
        <div className="auth-logo">
          <span className="auth-logo__mark">⬡</span>
          <span className="auth-logo__text">Grad-Ledger</span>
        </div>

        <div className="auth-card__header">
          <h1 className="auth-card__title">Set new password</h1>
          <p className="auth-card__sub">
            Choose a strong password for your account.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>

          {/* New password */}
          <div className="field">
            <label className="field__label" htmlFor="newPassword">
              New password
            </label>
            <div className="field__input-wrapper">
              <input
                id="newPassword"
                name="newPassword"
                type={showNew ? 'text' : 'password'}
                className={`field__input field__input--with-action ${fieldErrors.newPassword ? 'field__input--error' : ''}`}
                placeholder="••••••••"
                value={form.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
                autoFocus
                disabled={loading}
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showNew ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
              </button>
            </div>
            <PasswordStrength password={form.newPassword} />
            {fieldErrors.newPassword && (
              <span className="field__error">{fieldErrors.newPassword}</span>
            )}
          </div>

          {/* Confirm password */}
          <div className="field">
            <label className="field__label" htmlFor="confirmPassword">
              Confirm password
            </label>
            <div className="field__input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                className={`field__input field__input--with-action ${fieldErrors.confirmPassword ? 'field__input--error' : ''}`}
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="field__toggle"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirm ? (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4" />
                    <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                )}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <span className="field__error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          {/* Global error */}
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
                Updating…
              </>
            ) : (
              'Update password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}