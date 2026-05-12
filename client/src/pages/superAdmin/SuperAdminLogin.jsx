import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import {api} from '../../api/axios';
import './SuperAdminLogin.css';


export default function SuperAdminLogin() {
  const { setAuth} = useAuth();
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
      const { data } = await api.post('/api/auth/super-admin/login', {
        email: form.email.trim(),
        password: form.password,
      });

      setAuth(data.data)

      navigate('/super-admin/dashboard');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Invalid email or password.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

return (
    <div className="sa-login-page">
 
      {/* Top bar */}
      <div className="sa-topbar">
        <div className="sa-logo">
          <span className="sa-logo__mark">⬡</span>
          <span className="sa-logo__text">CertChain</span>
        </div>
        <span className="sa-topbar__badge">Platform administration</span>
      </div>
 
      {/* Center card */}
      <div className="sa-center">
        <div className="sa-card">
 
          {/* Icon */}
          <div className="sa-card__icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
 
          <div className="sa-card__header">
            <h1 className="sa-card__title">Super Admin</h1>
            <p className="sa-card__sub">
              Restricted access — authorised personnel only.
            </p>
          </div>
 
          <form className="sa-form" onSubmit={handleSubmit} noValidate>
 
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
                placeholder="admin@certchain.com"
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
            </div>
 
            {/* Error */}
            {error && (
              <div className="sa-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}
 
            {/* Submit */}
            <button
              type="submit"
              className="sa-btn"
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
        </div>
 
        {/* Footer note */}
        <p className="sa-footer">
          Organisation sign in?{' '}
          <Link to="/org-login">Go to org portal</Link>
        </p>
      </div>
    </div>
  );
}