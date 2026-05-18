import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../hooks/useAuth'; 
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import Header from '../../../components/Header';
import {parsePhoneNumberFromString} from 'libphonenumber-js';
import useApiPrivate from '../../../hooks/useApiPrivate';
import './ManageAdmins.css';

// ── Helpers ──────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '',         label: 'All'      },
  { value: 'ACTIVE',   label: 'Active'   },
  { value: 'DISABLED', label: 'Disabled' },
];

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Create admin modal ────────────────────────────────────

const EMPTY_FORM = {
  full_name:  '',
  job_title:  '',
  email:      '',
  phone:      '',
};

function CreateAdminModal({ onSuccess, onCancel }) {
  const [form,    setForm]    = useState(EMPTY_FORM);
  const [errors,  setErrors]  = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const api = useApiPrivate()
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name])  setErrors((p) => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  }

  function validate() {
    const e = {};
    if (!form.full_name.trim())  e.full_name  = 'Full name is required.';
    if (!form.job_title.trim())  e.job_title  = 'Job title is required.';
    if (!form.email.trim())      e.email      = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
                                 e.email      = 'Please enter a valid email.';
    if (!form.phone.trim())      e.phone      = 'Phone number is required.';
    if(!parsePhoneNumberFromString(form.phone.trim())) e.phone  = 'Enter Valid phone number';
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      await api.post('/api/org-super-admin', form, {
        headers: { 'Content-Type': 'application/json' },
      });
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) {
        setErrors({ email: 'This email is already in use.' });
      } else {
        setApiError(msg ?? 'Failed to create admin. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-modal-title">
      <div className="modal modal--create">

        <div className="modal__header">
          <div className="modal__icon modal__icon--blue" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
              <path d="M1 14c0-3 2-5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M11 10v4M9 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className="modal__title" id="create-modal-title">Create admin account</h2>
            <p className="modal__sub">
              A temporary password will be sent to the admin's email.
            </p>
          </div>
          <button
            className="modal__close"
            onClick={onCancel}
            disabled={loading}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {apiError && (
          <div className="modal__api-error" role="alert">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            {apiError}
          </div>
        )}

        <form className="modal__form" onSubmit={handleSubmit} noValidate>
          <div className="modal__grid">

            <div className="field">
              <label className="field__label" htmlFor="full_name">
                Full name <span className="field__req">*</span>
              </label>
              <input
                id="full_name" name="full_name" type="text"
                className={`field__input ${errors.full_name ? 'field__input--error' : ''}`}
                placeholder="Dr. Jean Paul Mbarga"
                value={form.full_name}
                onChange={handleChange}
                autoFocus
                disabled={loading}
              />
              {errors.full_name && <span className="field__error">{errors.full_name}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="job_title">
                Job title <span className="field__req">*</span>
              </label>
              <input
                id="job_title" name="job_title" type="text"
                className={`field__input ${errors.job_title ? 'field__input--error' : ''}`}
                placeholder="Deputy Registrar"
                value={form.job_title}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.job_title && <span className="field__error">{errors.job_title}</span>}
            </div>

            <div className="field modal__grid--full">
              <label className="field__label" htmlFor="email">
                Email address <span className="field__req">*</span>
              </label>
              <input
                id="email" name="email" type="email"
                className={`field__input ${errors.email ? 'field__input--error' : ''}`}
                placeholder="admin@institution.com"
                value={form.email}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.email && <span className="field__error">{errors.email}</span>}
            </div>

            <div className="field modal__grid--full">
              <label className="field__label" htmlFor="phone">
                Phone number <span className="field__req">*</span>
              </label>
              <input
                id="phone" name="phone" type="tel"
                className={`field__input ${errors.phone ? 'field__input--error' : ''}`}
                placeholder="+237 677 000 000"
                value={form.phone}
                onChange={handleChange}
                disabled={loading}
              />
              {errors.phone && <span className="field__error">{errors.phone}</span>}
            </div>

          </div>

          <div className="modal__actions">
            <button
              type="button"
              className="modal__btn modal__btn--cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal__btn modal__btn--create"
              disabled={loading}
            >
              {loading
                ? <><span className="spinner" aria-hidden="true" />Creating…</>
                : 'Create admin'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Toggle confirm modal ──────────────────────────────────

function ToggleModal({ admin, action, onConfirm, onCancel, loading }) {
  const isDisable = action === 'disable';
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="toggle-modal-title">
      <div className="modal">
        <div className="modal__header">
          <div className={`modal__icon ${isDisable ? 'modal__icon--warning' : 'modal__icon--success'}`} aria-hidden="true">
            {isDisable ? (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </div>
          <h2 className="modal__title" id="toggle-modal-title">
            {isDisable ? 'Disable admin' : 'Enable admin'}
          </h2>
        </div>

        <p className="modal__sub">
          {isDisable
            ? <>Disabling <strong>{admin.full_name}</strong> will prevent them from logging in
               and performing any certificate operations.</>
            : <>Re-enabling <strong>{admin.full_name}</strong> will restore their access
               and allow them to resume operations.</>
          }
        </p>

        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button
            className={`modal__btn ${isDisable ? 'modal__btn--warning' : 'modal__btn--success'}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" aria-hidden="true" />Processing…</>
              : isDisable ? 'Disable' : 'Enable'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Toast ─────────────────────────────────────────────────

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`toast toast--${type}`} role="status" aria-live="polite">
      {type === 'success'
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      }
      {message}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function ManageAdmins() {
  const { auth } = useAuth();
  const user = auth.user
  const api = useApiPrivate()

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [org,           setOrg]           = useState(null);
  const [admins,        setAdmins]        = useState([]);
  const [total,         setTotal]         = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');
  const [createModal,   setCreateModal]   = useState(false);
  const [toggleModal,   setToggleModal]   = useState(null); // { admin, action }
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState('');

  const debouncedSearch = useDebounce(search);

  // Fetch org profile once
  useEffect(() => {
    api.get('/api/organisations/profile')
      .then((r) => setOrg(r.data.data))
      .catch(() => {});
  }, [api]);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter     && { status: statusFilter    }),
      });
      const { data } = await api.get(`/api/org-super-admin?${params}`);
      setAdmins(data?.data ?? []);
      setTotal(data?.total ?? 0);
    } catch {
      setError('Failed to load admin accounts. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter,api]);

 useEffect(() => {
  const load = async () => {
    await fetchAdmins();
  };
  load();
}, [fetchAdmins]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  async function handleToggle() {
    if (!toggleModal) return;
    const { admin, action } = toggleModal;
    setActionLoading(true);
    try {
      await api.patch(`/api/org-super-admin/${admin.id}/${action}`);
      showToast(
        action === 'disable'
          ? `${admin.full_name} has been disabled.`
          : `${admin.full_name} has been re-enabled.`,
        'success'
      );
      setToggleModal(null);
      fetchAdmins();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Action failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function handleCreateSuccess() {
    setCreateModal(false);
    showToast('Admin account created. A temporary password has been sent by email.', 'success');
    fetchAdmins();
  }

  const activeCount   = admins.filter((a) => a.status === 'ACTIVE').length;
  const disabledCount = admins.filter((a) => a.status === 'DISABLED').length;

  return (
    <div className="ma-page">
      <OrgSuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        org={org}
      />

      <div className="ma-page__main">

        <Header org={org} user={user} setSidebarOpen={setSidebarOpen} />

        <div className="ma-content">

          {/* Page header */}
          <div className="ma-header">
            <div className="ma-header__left">
              <h1 className="ma-header__title">Admin accounts</h1>
              <div className="ma-header__meta">
                {!loading && (
                  <>
                    <span className="ma-count-pill ma-count-pill--active">
                      {activeCount} active
                    </span>
                    {disabledCount > 0 && (
                      <span className="ma-count-pill ma-count-pill--disabled">
                        {disabledCount} disabled
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>
            <button
              className="ma-create-btn"
              onClick={() => setCreateModal(true)}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" />
                <path d="M1 14c0-3 2-5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                <path d="M11 10v4M9 12h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              New admin
            </button>
          </div>

          {/* Toolbar */}
          <div className="ma-toolbar">
            <div className="search-field">
              <svg className="search-field__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                className="search-field__input"
                placeholder="Search by name or email…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search admins"
              />
              {search && (
                <button
                  className="search-field__clear"
                  onClick={() => setSearch('')}
                  aria-label="Clear search"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                    <path d="M2 2l8 8M10 2l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="filter-pills" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`filter-pill ${statusFilter === f.value ? 'filter-pill--active' : ''}`}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="ma-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Table */}
          <div className="ma-table-wrap">
            <table className="ma-table" aria-label="Admin accounts">
              <thead>
                <tr>
                  <th>Administrator</th>
                  <th className="col--title">Job title</th>
                  <th className="col--email">Email</th>
                  <th className="col--phone">Phone</th>
                  <th className="col--date">Created</th>
                  <th className="col--status">Status</th>
                  <th className="col--actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="table-row--skeleton" style={{ animationDelay: `${i * 50}ms` }}>
                      <td>
                        <div className="admin-cell">
                          <div className="skel skel--avatar" />
                          <div className="skel skel--name" />
                        </div>
                      </td>
                      <td className="col--title"><div className="skel skel--med" /></td>
                      <td className="col--email"><div className="skel skel--long" /></td>
                      <td className="col--phone"><div className="skel skel--med" /></td>
                      <td className="col--date"><div className="skel skel--short" /></td>
                      <td className="col--status"><div className="skel skel--badge" /></td>
                      <td className="col--actions" />
                    </tr>
                  ))
                ) : admins.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="ma-empty">
                        <div className="ma-empty__icon" aria-hidden="true">
                          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                            <circle cx="12" cy="10" r="6" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M2 28c0-6 4-10 10-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M22 20v8M18 24h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                        </div>
                        <p className="ma-empty__title">
                          {search || statusFilter ? 'No admins match your search' : 'No admin accounts yet'}
                        </p>
                        <p className="ma-empty__sub">
                          {search || statusFilter
                            ? 'Try adjusting your search or filter.'
                            : 'Create an admin account to start delegating certificate operations.'
                          }
                        </p>
                        {(search || statusFilter) ? (
                          <button
                            className="ma-empty__reset"
                            onClick={() => { setSearch(''); setStatusFilter(''); }}
                          >
                            Clear filters
                          </button>
                        ) : (
                          <button
                            className="ma-empty__cta"
                            onClick={() => setCreateModal(true)}
                          >
                            Create first admin
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  admins.map((admin, i) => (
                    <tr
                      key={admin.id}
                      className="table-row"
                      style={{ animationDelay: `${i * 40}ms` }}
                    >
                      {/* Name + initials */}
                      <td>
                        <div className="admin-cell">
                          <div
                            className={`admin-cell__avatar ${admin.status === 'DISABLED' ? 'admin-cell__avatar--disabled' : ''}`}
                            aria-hidden="true"
                          >
                            {getInitials(admin.full_name)}
                          </div>
                          <span className="admin-cell__name">{admin.full_name}</span>
                        </div>
                      </td>

                      <td className="col--title">
                        <span className="cell-text">{admin.job_title}</span>
                      </td>

                      <td className="col--email">
                        <span className="cell-text cell-text--mono">{admin.email}</span>
                      </td>

                      <td className="col--phone">
                        <span className="cell-text">{admin.phone}</span>
                      </td>

                      <td className="col--date">
                        <span className="cell-text">{formatDate(admin.created_at)}</span>
                      </td>

                      <td className="col--status">
                        <span className={`status-badge ${admin.status === 'ACTIVE' ? 'status-badge--active' : 'status-badge--disabled'}`}>
                          {admin.status === 'ACTIVE' ? 'Active' : 'Disabled'}
                        </span>
                      </td>

                      <td className="col--actions">
                        {admin.status === 'ACTIVE' ? (
                          <button
                            className="tbl-btn tbl-btn--disable"
                            onClick={() => setToggleModal({ admin, action: 'disable' })}
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            className="tbl-btn tbl-btn--enable"
                            onClick={() => setToggleModal({ admin, action: 'enable' })}
                          >
                            Enable
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Total count */}
          {!loading && admins.length > 0 && (
            <p className="ma-total">
              Showing {admins.length} of {total} admin{total !== 1 ? 's' : ''}
            </p>
          )}

        </div>
      </div>

      {/* Create modal */}
      {createModal && (
        <CreateAdminModal
          onSuccess={handleCreateSuccess}
          onCancel={() => setCreateModal(false)}
        />
      )}

      {/* Toggle modal */}
      {toggleModal && (
        <ToggleModal
          admin={toggleModal.admin}
          action={toggleModal.action}
          onConfirm={handleToggle}
          onCancel={() => setToggleModal(null)}
          loading={actionLoading}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}