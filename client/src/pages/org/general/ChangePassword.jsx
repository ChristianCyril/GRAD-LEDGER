import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import Header from '../../../components/Header';
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import './ChangePassword.css';
import useApiPrivate from '../../../hooks/useApiPrivate';
import OrgAdminSidebar from '../../../components/OrgAdminSidebar';





/* ─── Toast ──────────────────────────────────────────── */

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`cp-toast cp-toast--${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success'
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      }
      <span>{toast.message}</span>
    </div>
  );
}



/* ─── Main component ─────────────────────────────────── */

export default function ChangePassword() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [org, setOrg] = useState(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { auth } = useAuth();
  const user = auth.user;
  const api = useApiPrivate()
  const navigate = useNavigate();


  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
    ;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    // Validation
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (form.newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation password do not match.');
      return;
    }

    if (form.currentPassword === form.newPassword) {
      setError('New password must be different from current password.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('api/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      showToast('success', 'Password Changed Succesfully');
      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (err) {
      const msg = err.response?.data?.message;
      showToast('error', msg ?? 'Failed to change password.');
    } finally {
      setLoading(false);
    }
  }


  /* Stable toast via ref */
  const toastRef = useRef(null);
  useEffect(() => {
    toastRef.current = (type, message) => setToast({ type, message });
  }, []);
  const showToast = useCallback((type, message) => toastRef.current(type, message), []);

  /* Fetch org profile */
  useEffect(() => {
    api.get('/api/organisations/profile')
      .then(r => setOrg(r.data.data))
      .catch(console.error);
  }, [api]);



  return (

    <div className="cp-wrapper">
       {user.role === 'ORG_ADMIN'?
            <OrgAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} org={org} />:
            <OrgSuperAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} org={org} />
            }
            
      <div className="cp-main">
        <Header org={org} user={user} setSidebarOpen={setSidebarOpen} />

        <div className="cp-page">

          {/* Page header */}
          <div className="cp-page__head">
            <div>
              <p className="label" style={{ color: 'var(--color-primary)', marginBottom: 4 }}>
                User
              </p>
              <h1 className="cp-page__title">Change Your User Password</h1>
            </div>

          </div>
          <div className="change-password-bg" aria-hidden="true">
            <div className="change-password-grid">
              {Array.from({ length: 80 }).map((_, i) => (
                <div key={i} className="change-password-grid__cell" />
              ))}
            </div>
          </div>
          {/* Form card */}
          <div className="change-password-card">


            {/* Error message */}
            {error && (
              <div className="change-password-error" role="alert">
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <form className="change-password-form" onSubmit={handleSubmit} noValidate>
              {/* Current Password */}
              <div className="field">
                <label className="field__label" htmlFor="currentPassword">
                  Current Password
                </label>
                <div className="field__input-wrapper">
                  <input
                    id="currentPassword"
                    name="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    className="field__input field__input--with-action"
                    placeholder="••••••••"
                    value={form.currentPassword}
                    onChange={handleChange}
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowCurrentPassword((v) => !v)}
                    aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showCurrentPassword ? (
                      /* Eye-off icon */
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      /* Eye icon */
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="field">
                <label className="field__label" htmlFor="newPassword">
                  New Password
                </label>
                <div className="field__input-wrapper">
                  <input
                    id="newPassword"
                    name="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    className="field__input field__input--with-action"
                    placeholder="••••••••"
                    value={form.newPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowNewPassword((v) => !v)}
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showNewPassword ? (
                      /* Eye-off icon */
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      /* Eye icon */
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="field__hint">At least 8 characters</p>
              </div>

              {/* Confirm Password */}
              <div className="field">
                <label className="field__label" htmlFor="confirmPassword">
                  Confirm New Password
                </label>
                <div className="field__input-wrapper">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="field__input field__input--with-action"
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="field__toggle"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? (
                      /* Eye-off icon */
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        <path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                      </svg>
                    ) : (
                      /* Eye icon */
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4" />
                        <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="change-password-actions">
                <button
                  type="submit"
                  className="change-password-btn change-password-btn--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Changing password…
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
                <button
                  type="button"
                  className="change-password-btn change-password-btn--secondary"
                  onClick={() => navigate(-1)}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>

        <Toast toast={toast} onDismiss={() => setToast(null)} />
      </div>
    </div>
  );
}