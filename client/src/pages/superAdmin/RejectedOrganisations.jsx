import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import useApiPrivate from '../../hooks/useApiPrivate';
import './RejectedOrganisations.css';

// ── Helpers ──────────────────────────────────────────────

const ORG_TYPE_LABELS = {
  UNIVERSITY:         'University',
  COLLEGE:            'College',
  PROFESSIONAL_BODY:  'Professional Body',
  TRAINING_INSTITUTE: 'Training Institute',
};

const PAGE_SIZE = 10;

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ── Confirm modal ─────────────────────────────────────────

function ApproveModal({ org, onConfirm, onCancel, loading }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">

        <div className="modal__header">
          <div className="modal__icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2 className="modal__title" id="modal-title">Approve organisation</h2>
        </div>

        <p className="modal__sub">
          You are about to approve <strong>{org.name}</strong>. They will be
          notified by email and their administrator account will be activated.
        </p>

        {org.rejection_reason && (
          <div className="modal__reason">
            <span className="modal__reason-label">Previously rejected for</span>
            <span className="modal__reason-text">{org.rejection_reason}</span>
          </div>
        )}

        <div className="modal__actions">
          <button
            className="modal__btn modal__btn--cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            className="modal__btn modal__btn--approve"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading
              ? <><span className="spinner" aria-hidden="true" />Approving…</>
              : <>
                  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Approve
                </>
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

export default function RejectedOrganisations() {
  const navigate = useNavigate();
  const api = useApiPrivate()

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [orgs,          setOrgs]          = useState([]);
  const [total,         setTotal]         = useState(0);
  const [page,          setPage]          = useState(1);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search,        setSearch]        = useState('');
  const [pendingCount,  setPendingCount]  = useState(0);
  const [modal,         setModal]         = useState(null); // org object
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState('');

  const debouncedSearch = useDebounce(search);

  const fetchOrgs = useCallback(async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page:   pg,
        limit:  PAGE_SIZE,
        status: 'REJECTED',
        ...(debouncedSearch && { search: debouncedSearch }),
      });

      const [orgsRes, pendingRes] = await Promise.all([
        api.get(`api/super-admin/organisations?${params}`),
        api.get('api/super-admin/organisations/pending'),
      ]);

      setOrgs(orgsRes.data?.data ?? []);
      setTotal(orgsRes.data?.total ?? 0);
      setPendingCount(pendingRes.data?.length ?? 0);
      setPage(pg);
    } catch {
      setError('Failed to load rejected organisations. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch,api]);

  useEffect(() => { fetchOrgs(1); }, [fetchOrgs]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  async function handleApprove() {
    if (!modal) return;
    setActionLoading(true);
    try {
      await api.patch(`api/super-admin/organisations/${modal.id}/approve`);
      showToast(`${modal.name} has been approved.`, 'success');
      setModal(null);
      await fetchOrgs(page);
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to approve. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="rejected-page">
      <SuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      <div className="rejected-page__main">

        {/* Top bar */}
        <header className="rejected-topbar">
          <button
            className="rejected-hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="ham-line" /><span className="ham-line" /><span className="ham-line" />
          </button>

          <div className="rejected-topbar__left">
            <button
              className="rejected-topbar__back"
              onClick={() => navigate('/super-admin/organisations')}
              aria-label="Back"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="rejected-topbar__title">Rejected organisations</h1>
            {!loading && (
              <span className="rejected-topbar__count">{total}</span>
            )}
          </div>

          <div className="rejected-topbar__right">
            <span className="role-badge role--teal">Super Admin</span>
            <div className="sa-avatar">SA</div>
          </div>
        </header>

        {/* Content */}
        <div className="rejected-content">

          {/* Info banner */}
          <div className="rejected-info-banner">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Rejected organisations can be approved at any time. The administrator
            will be notified and their account activated immediately.
          </div>

          {/* Search bar */}
          <div className="rejected-toolbar">
            <div className="search-field">
              <svg className="search-field__icon" width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="search"
                className="search-field__input"
                placeholder="Search by name, email or code…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                aria-label="Search rejected organisations"
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
          </div>

          {/* Error */}
          {error && (
            <div className="rejected-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Table */}
          <div className="rejected-table-wrap">
            <table className="rejected-table" aria-label="Rejected organisations">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th className="col--type">Type</th>
                  <th className="col--country">Country</th>
                  <th className="col--email">Official email</th>
                  <th className="col--date">Rejected on</th>
                  <th className="col--reason">Reason</th>
                  <th className="col--action" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="table-row--skeleton" style={{ animationDelay: `${i * 40}ms` }}>
                      <td><div className="skel skel--name" /></td>
                      <td className="col--type"><div className="skel skel--short" /></td>
                      <td className="col--country"><div className="skel skel--short" /></td>
                      <td className="col--email"><div className="skel skel--med" /></td>
                      <td className="col--date"><div className="skel skel--short" /></td>
                      <td className="col--reason"><div className="skel skel--med" /></td>
                      <td className="col--action" />
                    </tr>
                  ))
                ) : orgs.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="rejected-empty">
                        <div className="rejected-empty__icon" aria-hidden="true">
                          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                            <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </div>
                        <p className="rejected-empty__title">No rejected organisations</p>
                        <p className="rejected-empty__sub">
                          {search
                            ? 'No results match your search.'
                            : 'No organisations have been rejected yet.'}
                        </p>
                        {search && (
                          <button
                            className="rejected-empty__reset"
                            onClick={() => setSearch('')}
                          >
                            Clear search
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orgs.map((org, i) => (
                    <tr
                      key={org.id}
                      className="table-row"
                      style={{ animationDelay: `${i * 30}ms` }}
                      onClick={() => navigate(`/super-admin/organisations/${org.id}`)}
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && navigate(`/super-admin/organisations/${org.id}`)}
                      aria-label={`View ${org.name}`}
                    >
                      {/* Name + code */}
                      <td>
                        <div className="org-cell org-cell-rejected">
                          <div className="org-cell__avatar" aria-hidden="true">
                            {org.logo_url
                              ? <img src={org.logo_url} alt="" />
                              : org.name?.[0]?.toUpperCase()
                            }
                          </div>
                          <div className="org-cell__info">
                            <span className="org-cell__name">{org.name}</span>
                            <span className="org-cell__code">{org.code}</span>
                          </div>
                        </div>
                      </td>

                      <td className="col--type">
                        <span className="cell-text">
                          {ORG_TYPE_LABELS[org.type] ?? org.type}
                        </span>
                      </td>

                      <td className="col--country">
                        <span className="cell-text">{org.country}</span>
                      </td>

                      <td className="col--email">
                        <span className="cell-text cell-text--mono">{org.official_email}</span>
                      </td>

                      <td className="col--date">
                        <span className="cell-text">{formatDate(org.updated_at)}</span>
                      </td>

                      <td className="col--reason">
                        <span className="reason-text">
                          {org.rejection_reason ?? '—'}
                        </span>
                      </td>

                      <td className="col--action" onClick={(e) => e.stopPropagation()}>
                        <button
                          className="approve-btn"
                          onClick={() => setModal(org)}
                        >
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                            <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          Approve
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && totalPages > 1 && (
            <div className="pagination">
              <span className="pagination__info">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
              </span>
              <div className="pagination__controls">
                <button
                  className="pagination__btn"
                  onClick={() => fetchOrgs(page - 1)}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .reduce((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === '…'
                      ? <span key={`ellipsis-${i}`} className="pagination__ellipsis">…</span>
                      : <button
                          key={p}
                          className={`pagination__btn pagination__btn--page ${page === p ? 'pagination__btn--active' : ''}`}
                          onClick={() => fetchOrgs(p)}
                          aria-label={`Page ${p}`}
                          aria-current={page === p ? 'page' : undefined}
                        >
                          {p}
                        </button>
                  )
                }

                <button
                  className="pagination__btn"
                  onClick={() => fetchOrgs(page + 1)}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Approve modal */}
      {modal && (
        <ApproveModal
          org={modal}
          onConfirm={handleApprove}
          onCancel={() => setModal(null)}
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