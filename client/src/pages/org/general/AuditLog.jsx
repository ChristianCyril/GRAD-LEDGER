import { useState, useEffect, useCallback, useRef } from 'react';
import useApiPrivate from '../../../hooks/useApiPrivate';
import { useAuth } from '../../../hooks/useAuth';
import Header from '../../../components/Header';
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import OrgAdminSidebar from '../../../components/OrgAdminSidebar';
import './AuditLog.css';

/* ─── Constants ──────────────────────────────────────── */

const PAGE_SIZE = 20;

const ACTION_OPTIONS = [
  { value: '',                     label: 'All actions'         },
  { value: 'CERTIFICATE_ISSUED',   label: 'Certificate issued'  },
  { value: 'CERTIFICATE_REVOKED',  label: 'Certificate revoked' },
  { value: 'ADMIN_CREATED',        label: 'Admin created'       },
  { value: 'ADMIN_ENABLED',        label: 'Admin enabled'       },
  { value: 'ADMIN_DISABLED',       label: 'Admin disabled'      },
  { value: 'ORG_PROFILE_UPDATED',  label: 'Profile updated'     },
];

const ACTION_META = {
  CERTIFICATE_ISSUED:  { label: 'Certificate issued',  color: 'green'  },
  CERTIFICATE_REVOKED: { label: 'Certificate revoked', color: 'red'    },
  ADMIN_CREATED:       { label: 'Admin created',       color: 'blue'   },
  ADMIN_ENABLED:       { label: 'Admin enabled',       color: 'green'  },
  ADMIN_DISABLED:      { label: 'Admin disabled',      color: 'neutral' },
  ORG_PROFILE_UPDATED: { label: 'Profile updated',     color: 'amber'  },
};

/* ─── Helpers ────────────────────────────────────────── */

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};


const roleLabel = (role) => {
  if (role === 'ORG_SUPER_ADMIN') return 'Org Super Admin';
  if (role === 'ORG_ADMIN')       return 'Org Admin';
  return role ?? '—';
};

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
};

/* ─── Action badge ───────────────────────────────────── */

function ActionBadge({ action }) {
  const meta = ACTION_META[action] ?? { label: action, color: 'neutral' };
  return (
    <span className={`al-badge al-badge--${meta.color}`}>
      {meta.label}
    </span>
  );
}

/* ─── Actor avatar ───────────────────────────────────── */

function ActorAvatar({ name, role }) {
  const colorClass = role === 'ORG_SUPER_ADMIN' ? 'al-avatar--blue' : 'al-avatar--amber';
  return (
    <span className={`al-avatar ${colorClass}`} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/* ─── Icons ──────────────────────────────────────────── */

function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M2 4h11M4 7.5h7M6 11h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M9 3L5 7.5 9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M6 3l4 4.5L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M2 2l9 9M11 2L2 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function Spinner({ size = 20 }) {
  return (
    <span
      className="al-spinner"
      style={{ width: size, height: size }}
      aria-label="Loading"
    />
  );
}

/* ─── Toast ──────────────────────────────────────────── */

function Toast({ toast, onDismiss }) {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div className={`al-toast al-toast--${toast.type}`} role="status" aria-live="polite">
      {toast.type === 'success'
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      }
      <span>{toast.message}</span>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────── */

function EmptyState({ filtered }) {
  return (
    <div className="al-empty">
      <div className="al-empty__icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="7" y="5" width="26" height="30" rx="2" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M13 13h14M13 19h14M13 25h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          <circle cx="30" cy="30" r="7" fill="var(--surface-page)" stroke="currentColor" strokeWidth="1.4"/>
          <path d="M27.5 30h5M30 27.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
        </svg>
      </div>
      <p className="al-empty__title">
        {filtered ? 'No entries match your filters' : 'No audit entries yet'}
      </p>
      <p className="al-empty__sub">
        {filtered
          ? 'Try adjusting the action type or date range.'
          : 'Actions taken in your organisation will appear here.'}
      </p>
    </div>
  );
}


/* ─── Main component ─────────────────────────────────── */

export default function AuditLog() {
  const [logs,        setLogs]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [toast,       setToast]       = useState(null);
  const [org,         setOrg]         = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admins,      setAdmins]      = useState([]);  // for actor filter (super admin only)

  /* Filters */
  const [action,   setAction]   = useState('');
  const [actorId,  setActorId]  = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate,   setToDate]   = useState('');

  const api      = useApiPrivate();
  const { auth } = useAuth();
  const user     = auth.user;
  const isSuperAdmin = user?.role === 'ORG_SUPER_ADMIN';
  const totalPages   = Math.ceil(total / PAGE_SIZE);

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

  /* Fetch admins list for actor filter (super admin only) */
  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/api/org-super-admin')
      .then(r => setAdmins(r.data.data ?? []))
      .catch(console.error);
  }, [api, isSuperAdmin]);
  
  /* Fetch audit log */
  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (action)   params.action   = action;
      if (actorId)  params.actor_id = actorId;
      if (fromDate) params.from     = fromDate;
      if (toDate)   params.to       = toDate;

      const res = await api.get('/api/audit', { params });
      setLogs(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      showToast('error', err.response?.data?.message ?? 'Failed to load audit log.');
    } finally {
      setLoading(false);
    }
  }, [api, page, action, actorId, fromDate, toDate, showToast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  /* Reset page when filters change */
  const applyFilter = (setter) => (val) => { setter(val); setPage(1); };

  const clearFilters = () => {
    setAction(''); setActorId(''); setFromDate(''); setToDate(''); setPage(1);
  };

  const isFiltered = action !== '' || actorId !== '' || fromDate !== '' || toDate !== '';

  return (
    <div className="al-wrapper">
      {user.role === 'ORG_ADMIN'?
      <OrgAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} org={org} />:
      <OrgSuperAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} org={org} />
      }
      
      <div className="al-main">
        <Header org={org} user={user} setSidebarOpen={setSidebarOpen} />

        <div className="al-page">

          {/* Page header */}
          <div className="al-page__head">
            <div>
              <p className="label" style={{ color: 'var(--color-primary)', marginBottom: 4 }}>
                Organisation
              </p>
              <h1 className="al-page__title">Audit log</h1>
              {!isSuperAdmin && (
                <p className="al-page__scope text-muted">
                  Showing your activity only
                </p>
              )}
            </div>
            <p className="al-page__count text-muted">
              {loading ? '—' : `${total} ${total === 1 ? 'entry' : 'entries'}`}
            </p>
          </div>

          {/* Filters */}
          <div className="al-filters-card">
            <div className="al-filters__row">
              <FilterIcon />
              <span className="label">Filters</span>
              {isFiltered && (
                <button className="al-clear-btn" onClick={clearFilters}>
                  <ClearIcon /> Clear all
                </button>
              )}
            </div>

            <div className="al-filters__grid">
              {/* Action type */}
              <div className="al-filter-field">
                <label className="label al-filter-field__label" htmlFor="al-action">
                  Action type
                </label>
                <select
                  id="al-action"
                  className="al-select"
                  value={action}
                  onChange={(e) => applyFilter(setAction)(e.target.value)}
                >
                  {ACTION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Actor — super admin only */}
              {isSuperAdmin && (
                <div className="al-filter-field">
                  <label className="label al-filter-field__label" htmlFor="al-actor">
                    Performed by
                  </label>
                  <select
                    id="al-actor"
                    className="al-select"
                    value={actorId}
                    onChange={(e) => applyFilter(setActorId)(e.target.value)}
                  >
                    <option value="">All admins</option>
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.full_name} ({roleLabel(a.role)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* From date */}
              <div className="al-filter-field">
                <label className="label al-filter-field__label" htmlFor="al-from">
                  From
                </label>
                <input
                  id="al-from"
                  type="date"
                  className="al-input"
                  value={fromDate}
                  max={toDate || undefined}
                  onChange={(e) => applyFilter(setFromDate)(e.target.value)}
                />
              </div>

              {/* To date */}
              <div className="al-filter-field">
                <label className="label al-filter-field__label" htmlFor="al-to">
                  To
                </label>
                <input
                  id="al-to"
                  type="date"
                  className="al-input"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(e) => applyFilter(setToDate)(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Log list */}
          <div className="al-card">
            {loading ? (
              <div className="al-loading"><Spinner /></div>
            ) : logs.length === 0 ? (
              <EmptyState filtered={isFiltered} />
            ) : (
              <>
                {/* Table header — visible on wider screens */}
                <div className="al-table-head">
                  <span className="label">Action</span>
                  <span className="label">Description</span>
                  <span className="label">Performed by</span>
                  <span className="label">Date & time</span>
                </div>

                {/* Table rows */}
                <div className="al-table-body">
                  {logs.map((log) => (
                    <div key={log.id} className="al-table-row">
                      <div className="al-table-row__action">
                        <ActionBadge action={log.action} />
                      </div>
                      <p className="al-table-row__desc">{log.description}</p>
                      <div className="al-table-row__actor">
                        <ActorAvatar name={log.actor?.full_name} role={log.actor?.role} />
                        <div>
                          <span className="al-table-row__actor-name">{log.actor?.full_name ?? '—'}</span>
                          <span className="al-table-row__actor-role text-muted">
                            {roleLabel(log.actor?.role)}
                          </span>
                        </div>
                      </div>
                      <span className="al-table-row__time text-muted">
                        {fmtDateTime(log.created_at)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="al-pagination">
                    <span className="al-pagination__info text-muted">
                      Page {page} of {totalPages} · {total} entries
                    </span>
                    <div className="al-pagination__btns">
                      <button
                        className="al-icon-btn"
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeftIcon />
                      </button>
                      <button
                        className="al-icon-btn"
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        aria-label="Next page"
                      >
                        <ChevronRightIcon />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

        </div>
      </div>

      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}