import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate,useLocation } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import useApiPrivate from '../../hooks/useApiPrivate';
import './PendingOrganisations.css';

// ── Helpers ──────────────────────────────────────────────


const ORG_TYPE_LABELS = {
  UNIVERSITY:          'University',
  COLLEGE:             'College',
  PROFESSIONAL_BODY:   'Professional Body',
  TRAINING_INSTITUTE:  'Training Institute',
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  < 30)  return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Org list item ─────────────────────────────────────────

function OrgListItem({ org, selected, onClick }) {
  return (
    <button
      className={`pending-item ${selected ? 'pending-item--selected' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <div className="pending-item__avatar" aria-hidden="true">
        {org.logo_url
          ? <img src={org.logo_url} alt="" />
          : org.name?.[0]?.toUpperCase()
        }
      </div>
      <div className="pending-item__body">
        <div className="pending-item__top">
          <span className="pending-item__name">{org.name}</span>
          <span className="pending-item__time">{timeAgo(org.created_at)}</span>
        </div>
        <div className="pending-item__meta">
          <span>{ORG_TYPE_LABELS[org.type] ?? org.type}</span>
          <span className="pending-item__dot" aria-hidden="true" />
          <span>{org.country}</span>
        </div>
      </div>
      <svg className="pending-item__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ── Detail field ──────────────────────────────────────────

function DetailField({ label, value }) {
  if (!value) return null;
  return (
    <div className="detail-field">
      <span className="detail-field__label">{label}</span>
      <span className="detail-field__value">{value}</span>
    </div>
  );
}

// ── Document link ─────────────────────────────────────────

function DocLink({ label, url }) {
  if (!url) return (
    <div className="doc-link doc-link--missing">
      <div className="doc-link__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="doc-link__body">
        <span className="doc-link__name">{label}</span>
        <span className="doc-link__status">Not provided</span>
      </div>
    </div>
  );
  return (
    <a className="doc-link" href={url} target="_blank" rel="noopener noreferrer">
      <div className="doc-link__icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="doc-link__body">
        <span className="doc-link__name">{label}</span>
        <span className="doc-link__open">Open PDF ↗</span>
      </div>
    </a>
  );
}

// ── Reject modal ──────────────────────────────────────────

function RejectModal({ orgName, onConfirm, onCancel, loading }) {
  const [reason, setReason] = useState('');
  const [error,  setError]  = useState('');

  function handleConfirm() {
    if (!reason.trim()) { setError('Please provide a reason for rejection.'); return; }
    onConfirm(reason.trim());
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <div className="modal__header">
          <div className="modal__icon modal__icon--danger" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </div>
          <h2 className="modal__title" id="modal-title">Reject organisation</h2>
        </div>
        <p className="modal__sub">
          You are about to reject <strong>{orgName}</strong>. They will be notified
          by email with the reason you provide.
        </p>
        <div className="field">
          <label className="field__label" htmlFor="reject-reason">
            Reason for rejection <span className="field__required">*</span>
          </label>
          <textarea
            id="reject-reason"
            className={`modal__textarea ${error ? 'modal__textarea--error' : ''}`}
            placeholder="Explain why this application is being rejected…"
            value={reason}
            onChange={(e) => { setReason(e.target.value); if (error) setError(''); }}
            rows={4}
            disabled={loading}
            autoFocus
          />
          {error && <span className="field__error">{error}</span>}
        </div>
        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className="modal__btn modal__btn--danger" onClick={handleConfirm} disabled={loading}>
            {loading ? <><span className="spinner spinner--dark" aria-hidden="true" /> Rejecting…</> : 'Reject application'}
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
      {type === 'success' ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      )}
      {message}
    </div>
  );
}

// ── Main component ────────────────────────────────────────

export default function PendingOrganisations() {
  const navigate = useNavigate();
  const api = useApiPrivate();
  const initialFetch = useRef(true);
  const location = useLocation();
  const preSelectedId = location.state?.selectedId;
  
  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [orgs,          setOrgs]          = useState([]);
  const [selected,      setSelected]      = useState(null);   // full org object
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [panelOpen,     setPanelOpen]     = useState(false);  // mobile panel toggle
  const [rejectModal,   setRejectModal]   = useState(false);
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState('');

  // Fetch pending list
  const fetchPending = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/super-admin/organisations/pending');
      setOrgs(data.data ?? []);
      // Auto-select first on desktop
      const target = preSelectedId
        ? data.data.find((o) => o.id === preSelectedId)
        : data.data[0];

      if (target) setSelected(target);
    } catch {
      setError('Failed to load pending organisations. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    if (initialFetch.current) {
      initialFetch.current = false;
      fetchPending();
    }
  }, [fetchPending]);

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  // Approve
  async function handleApprove() {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.patch(`/api/super-admin/organisations/${selected.id}/approve`);
      showToast(`${selected.name} approved successfully.`, 'success');
      setSelected(null);
      setPanelOpen(false);
      await fetchPending();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to approve. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  // Reject
  async function handleReject(reason) {
    if (!selected) return;
    setActionLoading(true);
    try {
      await api.patch(
        `/api/super-admin/organisations/${selected.id}/reject`,
        { reason },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      showToast(`${selected.name} has been rejected.`, 'success');
      setRejectModal(false);
      setSelected(null);
      setPanelOpen(false);
      await fetchPending();
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Failed to reject. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  function selectOrg(org) {
    setSelected(org);
    setPanelOpen(true);
  }

  const pendingCount = orgs.length;

  return (
    <div className="pending-page">
      <SuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      <div className="pending-page__main">

        {/* Top bar */}
        <header className="pending-topbar">
          <button className="pending-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span className="ham-line" /><span className="ham-line" /><span className="ham-line" />
          </button>
          <div className="pending-topbar__title-group">
            <button className="pending-topbar__back" onClick={() => navigate('/super-admin/dashboard')} aria-label="Back to dashboard">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h1 className="pending-topbar__title">Pending review</h1>
            {pendingCount > 0 && (
              <span className="pending-topbar__count">{pendingCount}</span>
            )}
          </div>
          <div className="pending-topbar__right">
            <span className="role-badge role--teal">Super Admin</span>
            <div className="sa-dashboard__avatar">SA</div>
          </div>
        </header>

        {/* Body — split panel layout */}
        <div className={`pending-body ${panelOpen ? 'pending-body--panel-open' : ''}`}>

          {/* Left — list */}
          <div className="pending-list-col">
            {error && (
              <div className="pending-error" role="alert">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            {loading ? (
              <div className="pending-skeleton-list">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="pending-skeleton-item" style={{ animationDelay: `${i * 80}ms` }} />
                ))}
              </div>
            ) : orgs.length === 0 ? (
              <div className="pending-empty">
                <div className="pending-empty__icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5" />
                    <path d="M10 16l4 4 8-8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="pending-empty__title">All caught up</p>
                <p className="pending-empty__sub">No organisations are waiting for review.</p>
              </div>
            ) : (
              <div className="pending-list">
                {orgs.map((org) => (
                  <OrgListItem
                    key={org.id}
                    org={org}
                    selected={selected?.id === org.id}
                    onClick={() => selectOrg(org)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Right — detail panel */}
          <div className={`pending-panel ${panelOpen ? 'pending-panel--visible' : ''}`}>
            {!selected ? (
              <div className="pending-panel__placeholder">
                <div className="pending-panel__placeholder-icon" aria-hidden="true">
                  <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                    <path d="M4 26V12l12-8 12 8v14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <rect x="11" y="18" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                </div>
                <p>Select an organisation to review</p>
              </div>
            ) : (
              <div className="pending-panel__inner">

                {/* Panel header */}
                <div className="panel-header">
                  <button
                    className="panel-header__back"
                    onClick={() => { setPanelOpen(false); }}
                    aria-label="Back to list"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="panel-header__org">
                    <div className="panel-header__avatar" aria-hidden="true">
                      {selected.logo_url
                        ? <img src={selected.logo_url} alt="" />
                        : selected.name?.[0]?.toUpperCase()
                      }
                    </div>
                    <div>
                      <h2 className="panel-header__name">{selected.name}</h2>
                      <p className="panel-header__sub">
                        Applied {timeAgo(selected.created_at)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Scrollable content */}
                <div className="panel-content">

                  {/* Organisation info */}
                  <section className="panel-section">
                    <h3 className="panel-section__title">Organisation details</h3>
                    <div className="panel-fields">
                      <DetailField label="Code"    value={selected.code} />
                      <DetailField label="Type"    value={ORG_TYPE_LABELS[selected.type] ?? selected.type} />
                      <DetailField label="Country" value={selected.country} />
                      <DetailField label="City"    value={selected.city} />
                      <DetailField label="Phone"   value={selected.phone} />
                      <DetailField label="Address" value={selected.address} />
                      {selected.website && (
                        <div className="detail-field">
                          <span className="detail-field__label">Website</span>
                          <a
                            className="detail-field__value detail-field__link"
                            href={selected.website}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {selected.website} ↗
                          </a>
                        </div>
                      )}
                      <div className="detail-field detail-field--full">
                        <span className="detail-field__label">Official email</span>
                        <span className="detail-field__value">{selected.official_email}</span>
                      </div>
                    </div>
                  </section>

                  {/* Admin account */}
                  {selected.users?.[0] && (
                    <section className="panel-section">
                      <h3 className="panel-section__title">Administrator account</h3>
                      <div className="panel-fields">
                        <DetailField label="Name"      value={selected.users[0].full_name} />
                        <DetailField label="Job title" value={selected.users[0].job_title} />
                        <DetailField label="Email"     value={selected.users[0].email} />
                        <DetailField label="Phone"     value={selected.users[0].phone} />
                      </div>
                    </section>
                  )}

                  {/* Documents */}
                  <section className="panel-section">
                    <h3 className="panel-section__title">Supporting documents</h3>
                    <div className="panel-docs">
                      <DocLink label="Certificate of incorporation" url={selected.doc_incorporation} />
                      <DocLink label="Letter of intent"             url={selected.doc_letter_of_intent} />
                      <DocLink label="Accreditation document"       url={selected.doc_accreditation} />
                    </div>
                  </section>

                </div>

                {/* Action bar */}
                <div className="panel-actions">
                  <button
                    className="panel-btn panel-btn--reject"
                    onClick={() => setRejectModal(true)}
                    disabled={actionLoading}
                  >
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    Reject
                  </button>
                  <button
                    className="panel-btn panel-btn--approve"
                    onClick={handleApprove}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <><span className="spinner" aria-hidden="true" /> Processing…</>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                          <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Approve
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reject modal */}
      {rejectModal && (
        <RejectModal
          orgName={selected?.name}
          onConfirm={handleReject}
          onCancel={() => setRejectModal(false)}
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