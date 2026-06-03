import { useState, useEffect, useRef, useCallback } from 'react';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import useApiPrivate from '../../hooks/useApiPrivate';
import '../org/general/ChangePassword.css';
import './ChangePasswordSuperAdmin.css'
import { useNavigate } from 'react-router-dom';





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


// ── Main component ───────────────────────────────────────
export default function ChangePasswordSuperAdmin() {
  const apiPrivate = useApiPrivate()
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [pCountError, setPCountError] = useState('');
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('')
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      setPCountError('');
      try {
        const pendingRes = await apiPrivate.get('api/super-admin/organisations/pending')
        setPendingCount(pendingRes.data?.data.length ?? 0);
      } catch {
        setPCountError('Failed to load Pending Count');
      }
    }
    fetchData();
  }, [apiPrivate]);

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
      await apiPrivate.post('api/auth/change-password', {
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




  return (
    <div className="sa-cp">

      {/* Sidebar */}
      <SuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      {/* Main content — offset by sidebar width */}
      <div className="sa-cp__main">

        {/* Top bar */}
        <header className="sa-cp__topbar">
          <button
            className="sa-cp__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="ham-line" />
            <span className="ham-line" />
            <span className="ham-line" />
          </button>

          <div className="sa-cp__topbar-logo">
            <span style={{ color: 'var(--teal-400)', fontSize: 18 }}>⬡</span>
            <span className="sa-cp__topbar-name">Grad-Ledger</span>
          </div>

          <div className="sa-cp__topbar-right">
            <span className="role-badge role--teal">Super Admin</span>
            <div className="sa-cp__avatar" aria-label="Super Admin">
              SA
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="sa-cp__content">
          <div className="cp-page">

            {/* Page header */}
            <div className="cp-page__head">
              {/* Error */}
              {pCountError && (
                <div className="sa-dash__error" role="alert">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                    <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                  {pCountError}
                </div>
              )}
              <div>
                <p className="label" style={{ color: 'var(--color-primary)', marginBottom: 4 }}>
                  Super Admin
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
    </div>
  );
}