import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import './AllOrganisations.css';
import useApiPrivate from '../../hooks/useApiPrivate';

// ── Constants ────────────────────────────────────────────

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'DISABLED', label: 'Disabled' },
];

const ORG_TYPE_LABELS = {
  UNIVERSITY: 'University',
  COLLEGE: 'College',
  PROFESSIONAL_BODY: 'Professional Body',
  TRAINING_INSTITUTE: 'Training Institute',
};

const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', cls: 'badge--approved' },
  PENDING: { label: 'Pending', cls: 'badge--pending' },
  REJECTED: { label: 'Rejected', cls: 'badge--rejected' },
  DISABLED: { label: 'Disabled', cls: 'badge--disabled' },
};

const PAGE_SIZE = 10;

// ── Helpers ──────────────────────────────────────────────

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Confirm modal ─────────────────────────────────────────

function ConfirmModal({ org, action, onConfirm, onCancel, loading }) {
  const isDisable = action === 'disable';
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
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
          <h2 className="modal__title" id="confirm-title">
            {isDisable ? 'Disable organisation' : 'Enable organisation'}
          </h2>
        </div>

        <p className="modal__sub">
          {isDisable ? (
            <>Disabling <strong>{org.name}</strong> will suspend all administrator accounts
              and prevent any certificate operations until re-enabled.</>
          ) : (
            <>Re-enabling <strong>{org.name}</strong> will restore all administrator accounts
              and resume normal operations.</>
          )}
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
              ? <><span className={`spinner ${isDisable ? '' : 'spinner--success'}`} aria-hidden="true" />Processing…</>
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
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" /><path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" /><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
      }
      {message}
    </div>
  );
}



// ── Main component ────────────────────────────────────────

export default function AllOrganisations() {
  const navigate = useNavigate();
  const api = useApiPrivate()


  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgs, setOrgs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [modal, setModal] = useState(null); // { org, action }
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');

  const debouncedSearch = useDebounce(search);

  const fetchOrgs = useCallback(async (pg = 1) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        page: pg,
        limit: PAGE_SIZE,
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
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
      setError('Failed to load organisations. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, api]);

  // Re-fetch when search or filter changes — reset to page 1
  useEffect(() => {
    fetchOrgs(1);
  }, [fetchOrgs]);
  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  async function handleAction() {
    if (!modal) return;
    const { org, action } = modal;
    setActionLoading(true);
    try {
      await api.patch(`api/super-admin/organisations/${org.id}/${action}`);
      showToast(
        action === 'disable'
          ? `${org.name} has been disabled.`
          : `${org.name} has been re-enabled.`,
        'success'
      );
      setModal(null);
      await fetchOrgs(page);
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Action failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function handleRowClick(org) {
  if (org.status === 'PENDING') {
    navigate('/super-admin/organisations/pending', { state: { selectedId: org.id } });
  } else {
    navigate(`/super-admin/organisations/${org.id}`);
  }
}

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="all-orgs-page">
      <SuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      <div className="all-orgs-page__main">

        {/* Top bar */}
        <header className="all-orgs-topbar">
          <button className="all-orgs-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span className="ham-line" /><span className="ham-line" /><span className="ham-line" />
          </button>

          <div className="all-orgs-topbar__title-group">
            <button
              className="all-orgs-topbar__back"
              onClick={() => navigate('/super-admin/dashboard')}
              aria-label="Back"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="all-orgs-topbar__title">All organisations</h1>
            {!loading && (
              <span className="all-orgs-topbar__total">{total}</span>
            )}
          </div>

          <div className="all-orgs-topbar__right">
            <span className="role-badge role--teal">Super Admin</span>
            <div className="sa-avatar">SA</div>
          </div>
        </header>

        {/* Page content */}
        <div className="all-orgs-content">

          {/* Toolbar */}
          <div className="all-orgs-toolbar">

            {/* Search */}
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
                aria-label="Search organisations"
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

            {/* Status filter pills */}
            <div className="filter-pills" role="group" aria-label="Filter by status">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  className={`filter-pill ${statusFilter === f.value ? 'filter-pill--active' : ''}`}
                  onClick={() => { setStatusFilter(f.value); setPage(1); }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="all-orgs-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Table */}
          <div className="all-orgs-table-wrap">
            <table className="all-orgs-table" aria-label="Organisations table">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th className="col--type">Type</th>
                  <th className="col--country">Country</th>
                  <th className="col--email">Official email</th>
                  <th className="col--status">Status</th>
                  <th className="col--date">Registered</th>
                  <th className="col--actions" aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: PAGE_SIZE }).map((_, i) => (
                    <tr key={i} className="table-row--skeleton" style={{ animationDelay: `${i * 40}ms` }}>
                      <td><div className="skel skel--name" /></td>
                      <td className="col--type"><div className="skel skel--short" /></td>
                      <td className="col--country"><div className="skel skel--short" /></td>
                      <td className="col--email"><div className="skel skel--med" /></td>
                      <td className="col--status"><div className="skel skel--badge" /></td>
                      <td className="col--date"><div className="skel skel--short" /></td>
                      <td className="col--actions" />
                    </tr>
                  ))
                ) : orgs.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="all-orgs-empty">
                        <div className="all-orgs-empty__icon" aria-hidden="true">
                          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
                            <path d="M4 26V12l12-8 12 8v14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                            <rect x="11" y="18" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                          </svg>
                        </div>
                        <p className="all-orgs-empty__title">No organisations found</p>
                        <p className="all-orgs-empty__sub">
                          {search || statusFilter
                            ? 'Try adjusting your search or filter.'
                            : 'No organisations have registered yet.'}
                        </p>
                        {(search || statusFilter) && (
                          <button
                            className="all-orgs-empty__reset"
                            onClick={() => { setSearch(''); setStatusFilter(''); }}
                          >
                            Clear filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  orgs.map((org, i) => {
                    const sc = STATUS_CONFIG[org.status] ?? { label: org.status, cls: '' };
                    return (
                      <tr
                        key={org.id}
                        className="table-row"
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => handleRowClick(org)}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && handleRowClick(org)}
                        aria-label={`View ${org.name}`}
                      >
                        {/* Name + code */}
                        <td>
                          <div className="org-cell">
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

                        <td className="col--status">
                          <span className={`badge ${sc.cls}`}>{sc.label}</span>
                        </td>

                        <td className="col--date">
                          <span className="cell-text">
                            {new Date(org.created_at).toLocaleDateString('en-GB', {
                              day: 'numeric', month: 'short', year: 'numeric'
                            })}
                          </span>
                        </td>

                        <td className="col--actions" onClick={(e) => e.stopPropagation()}>
                          {org.status === 'APPROVED' && (
                            <button
                              className="tbl-btn tbl-btn--disable"
                              onClick={() => setModal({ org, action: 'disable' })}
                            >
                              Disable
                            </button>
                          )}
                          {org.status === 'DISABLED' && (
                            <button
                              className="tbl-btn tbl-btn--enable"
                              onClick={() => setModal({ org, action: 'enable' })}
                            >
                              Enable
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
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

      {/* Confirm modal */}
      {modal && (
        <ConfirmModal
          org={modal.org}
          action={modal.action}
          onConfirm={handleAction}
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