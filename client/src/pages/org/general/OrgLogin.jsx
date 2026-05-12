import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import {api} from '../../../api/axios';
import './OrgLogin.css';

const ROLE_REDIRECTS = {
  ORG_SUPER_ADMIN: '/org-super-admin/dashboard',
  ORG_ADMIN: '/org-admin/dashboard',
};

export default function OrgLogin() {
  const { setAuth } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please enter your email and password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('api/auth/org/login', {
        email: form.email.trim(),
        password: form.password,
      });

      setAuth(data.data)

      navigate(ROLE_REDIRECTS[data.data.user.role]);
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 403) {
        setError(msg ?? 'Your account or organisation is not authorised.');
      } else if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left panel — branding */}
      <div className="login-panel login-panel--brand">
        <div className="brand-content">
          <div className="brand-logo">
            <span className="brand-logo__mark">⬡</span>
            <span className="brand-logo__text">Grad-Ledger</span>
          </div>

          <div className="brand-body">
            <h2 className="brand-headline">
              Credentials that<br />can't be forged.
            </h2>
            <p className="brand-sub">
              Issue, manage, and verify academic certificates
              anchored to an immutable blockchain record.
            </p>
          </div>

          <div className="brand-stats">
            <div className="brand-stat">
              <span className="brand-stat__number">100%</span>
              <span className="brand-stat__label">Tamper-proof</span>
            </div>
            <div className="brand-stat__divider" />
            <div className="brand-stat">
              <span className="brand-stat__number">instant</span>
              <span className="brand-stat__label">Verification</span>
            </div>
            <div className="brand-stat__divider" />
            <div className="brand-stat">
              <span className="brand-stat__number">∞</span>
              <span className="brand-stat__label">Auditability</span>
            </div>
          </div>
        </div>

        {/* Decorative grid */}
        <div className="brand-grid" aria-hidden="true">
          {Array.from({ length: 80 }).map((_, i) => (
            <div key={i} className="brand-grid__cell" />
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="login-panel login-panel--form">
        <div className="form-card">
          <div className="form-card__header">
            <h1 className="form-card__title">Organisation sign in</h1>
            <p className="form-card__sub">
              Sign in with your institutional account
            </p>
          </div>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="field">
              <label className="field__label" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                className="field__input"
                placeholder="you@institution.com"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
                disabled={loading}
              />
            </div>

            {/* Password */}
            <div className="field">
              <div className="field__label-row">
                <label className="field__label" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="field__forgot"
                  tabIndex={loading ? -1 : 0}
                >
                  Forgot password?
                </Link>
              </div>

              <div className="field__input-wrapper">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className="field__input field__input--with-action"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="field__toggle"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    /* Eye-off icon */
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                      <path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                  ) : (
                    /* Eye icon */
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4"/>
                      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="login-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              className="login-btn"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Signing in…
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <p className="form-card__footer">
            Not registered yet?{' '}
            <Link to="/register">Register your organisation</Link>
          </p>
        </div>
      </div>
    </div>
  );
}