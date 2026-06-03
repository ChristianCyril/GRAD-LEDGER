import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import useApiPrivate from '../../hooks/useApiPrivate';
import './ViewOrganisation.css';

// ── Helpers ──────────────────────────────────────────────

const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', cls: 'badge--approved' },
  PENDING:  { label: 'Pending',  cls: 'badge--pending'  },
  REJECTED: { label: 'Rejected', cls: 'badge--rejected' },
  DISABLED: { label: 'Disabled', cls: 'badge--disabled' },
};

const ORG_TYPE_LABELS = {
  UNIVERSITY:         'University',
  COLLEGE:            'College',
  PROFESSIONAL_BODY:  'Professional Body',
  TRAINING_INSTITUTE: 'Training Institute',
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Sub-components ────────────────────────────────────────

function InfoField({ label, value, mono = false, full = false }) {
  if (!value) return null;
  return (
    <div className={`info-field ${full ? 'info-field--full' : ''}`}>
      <span className="info-field__label">{label}</span>
      <span className={`info-field__value ${mono ? 'info-field__value--mono' : ''}`}>
        {value}
      </span>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <section className="info-section">
      <h3 className="info-section__title">{title}</h3>
      <div className="info-section__grid">
        {children}
      </div>
    </section>
  );
}

function DocCard({ label, url }) {
  const missing = !url;
  return (
    <div className={`doc-card ${missing ? 'doc-card--missing' : ''}`}>
      <div className="doc-card__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="doc-card__body">
        <span className="doc-card__name">{label}</span>
        {missing ? (
          <span className="doc-card__status doc-card__status--missing">Not provided</span>
        ) : (
          <a
            className="doc-card__status doc-card__status--link"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Open PDF ↗
          </a>
        )}
      </div>
      {!missing && (
        <div className="doc-card__check" aria-hidden="true">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

function AdminCard({ user }) {
  return (
    <div className="admin-card">
      <div className="admin-card__avatar" aria-hidden="true">
        {user.full_name?.[0]?.toUpperCase()}
      </div>
      <div className="admin-card__body">
        <div className="admin-card__top">
          <span className="admin-card__name">{user.full_name}</span>
          <span className={`badge ${user.status === 'ACTIVE' ? 'badge--approved' : 'badge--disabled'}`}>
            {user.status === 'ACTIVE' ? 'Active' : 'Disabled'}
          </span>
        </div>
        <span className="admin-card__title">{user.job_title}</span>
        <div className="admin-card__contacts">
          <span className="admin-card__contact">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <rect x="1" y="3" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
              <path d="M1 4l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {user.email}
          </span>
          <span className="admin-card__contact">
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1h.9a1 1 0 0 1 .95.68l.7 2.1a1 1 0 0 1-.23 1.02L4.9 5.72a8 8 0 0 0 3.38 3.38l1.92-.92a1 1 0 0 1 1.02-.23l2.1.7A1 1 0 0 1 14 9.6v.9A1.5 1.5 0 0 1 12.5 12C6.7 12 2 7.3 2 1.5v-.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {user.phone}
          </span>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmCls, icon, onConfirm, onCancel, loading, children }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <div className="modal__header">
          <div className={`modal__icon ${icon}`} aria-hidden="true">
            {icon === 'modal__icon--warning' ? (
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
          <h2 className="modal__title" id="modal-title">{title}</h2>
        </div>
        <p className="modal__sub">{message}</p>
        {children}
        <div className="modal__actions">
          <button className="modal__btn modal__btn--cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </button>
          <button className={`modal__btn ${confirmCls}`} onClick={onConfirm} disabled={loading}>
            {loading
              ? <><span className="spinner" aria-hidden="true" />Processing…</>
              : confirmLabel
            }
          </button>
        </div>
      </div>
    </div>
  );
}

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

export default function ViewOrganisation() {
  const api = useApiPrivate()
  const { id } = useParams();
  const navigate = useNavigate();

  const [sidebarOpen,   setSidebarOpen]   = useState(false);
  const [org,           setOrg]           = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [modal,         setModal]         = useState(null);
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState('');
  const [pendingCount,  setPendingCount]  = useState(0);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const [orgRes, pendingRes] = await Promise.all([
          api.get(`api/super-admin/organisations/${id}`),
          api.get('api/super-admin/organisations/pending'),
        ]);
        setOrg(orgRes.data.data);
        setPendingCount(pendingRes.data?.data.length ?? 0);
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Organisation not found.');
        } else {
          setError('Failed to load organisation. Please refresh.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id,api]);
 

  function showToast(message, type = 'success') {
    setToast({ message, type });
  }

  async function handleAction(action, body = {}) {
    setActionLoading(true);
    try {
      await api.patch(`api/super-admin/organisations/${id}/${action}`, body);
      const updated = await api.get(`api/super-admin/organisations/${id}`);
      setOrg(updated.data.data);
      setModal(null);
      showToast(
        action === 'disable'  ? `${org.name} has been disabled.`      :
        action === 'enable'   ? `${org.name} has been re-enabled.`    :
        action === 'approve'  ? `${org.name} has been approved.`      :
        `${org.name} has been rejected.`,
        'success'
      );
    } catch (err) {
      showToast(err.response?.data?.message ?? 'Action failed. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  const sc = STATUS_CONFIG[org?.status] ?? { label: org?.status, cls: '' };

  // ── Modal configs ──────────────────────────────────────
  const MODALS = {
    disable: {
      title: 'Disable organisation',
      message: `Disabling ${org?.name} will suspend all administrator accounts and prevent certificate operations until re-enabled.`,
      confirmLabel: 'Disable',
      confirmCls: 'modal__btn--warning',
      icon: 'modal__icon--warning',
      onConfirm: () => handleAction('disable'),
    },
    enable: {
      title: 'Enable organisation',
      message: `Re-enabling ${org?.name} will restore all administrator accounts and resume normal operations.`,
      confirmLabel: 'Enable',
      confirmCls: 'modal__btn--success',
      icon: 'modal__icon--success',
      onConfirm: () => handleAction('enable'),
    },
  };

  return (
    <div className="view-org-page">
      <SuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      <div className="view-org-page__main">

        {/* Top bar */}
        <header className="view-org-topbar">
          <button className="view-org-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <span className="ham-line" /><span className="ham-line" /><span className="ham-line" />
          </button>

          <div className="view-org-topbar__left">
            <button
              className="view-org-topbar__back"
              onClick={() => navigate(-1)}
              aria-label="Go back"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <nav className="breadcrumb" aria-label="Breadcrumb">
              <button className="breadcrumb__link" onClick={() => navigate('/super-admin/organisations')}>
                Organisations
              </button>
              <span className="breadcrumb__sep" aria-hidden="true">/</span>
              <span className="breadcrumb__current">
                {loading ? '…' : org?.name ?? 'Not found'}
              </span>
            </nav>
          </div>

          <div className="view-org-topbar__right">
            <span className="role-badge role--teal">Super Admin</span>
            <div className="sa-avatar">SA</div>
          </div>
        </header>

        {/* Content */}
        <div className="view-org-content">

          {/* Error state */}
          {error && !loading && (
            <div className="view-org-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="view-org-skeleton">
              <div className="skel-hero" />
              <div className="skel-body">
                {[120, 80, 140, 100, 90, 120].map((w, i) => (
                  <div key={i} className="skel-line" style={{ width: w, animationDelay: `${i * 60}ms` }} />
                ))}
              </div>
            </div>
          )}

          {/* Main content */}
          {!loading && org && (
            <>
              {/* Hero */}
              <div className="org-hero">
                <div className="org-hero__left">
                  <div className="org-hero__avatar" aria-hidden="true">
                    {org.logo_url
                      ? <img src={org.logo_url} alt={org.name} />
                      : org.name?.[0]?.toUpperCase()
                    }
                  </div>
                  <div className="org-hero__info">
                    <div className="org-hero__title-row">
                      <h1 className="org-hero__name">{org.name}</h1>
                      <span className={`badge ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <div className="org-hero__meta">
                      <span>{ORG_TYPE_LABELS[org.type] ?? org.type}</span>
                      <span className="org-hero__dot" aria-hidden="true" />
                      <span>{org.city}, {org.country}</span>
                      <span className="org-hero__dot" aria-hidden="true" />
                      <span className="org-hero__code">{org.code}</span>
                    </div>
                    {org.website && (
                      <a
                        className="org-hero__website"
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {org.website} ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Action buttons */}
                <div className="org-hero__actions">
                  {org.status === 'APPROVED' && (
                    <button
                      className="hero-btn hero-btn--warning"
                      onClick={() => setModal('disable')}
                      disabled={actionLoading}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                      </svg>
                      Disable organisation
                    </button>
                  )}
                  {org.status === 'DISABLED' && (
                    <button
                      className="hero-btn hero-btn--success"
                      onClick={() => setModal('enable')}
                      disabled={actionLoading}
                    >
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                        <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Enable organisation
                    </button>
                  )}
                </div>
              </div>

              {/* Rejection notice */}
              {org.status === 'REJECTED' && org.rejection_reason && (
                <div className="rejection-notice">
                  <div className="rejection-notice__icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <p className="rejection-notice__label">Rejection reason</p>
                    <p className="rejection-notice__text">{org.rejection_reason}</p>
                  </div>
                </div>
              )}

              {/* Disabled notice */}
              {org.status === 'DISABLED' && org.disabled_at && (
                <div className="disabled-notice">
                  <div className="disabled-notice__icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M4 8h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                  </div>
                  <p>Disabled on {formatDate(org.disabled_at)}. All administrator accounts are currently suspended.</p>
                </div>
              )}

              {/* Two-column layout */}
              <div className="view-org-grid">

                {/* Left column */}
                <div className="view-org-col">

                  <InfoSection title="Organisation details">
                    <InfoField label="Official email" value={org.official_email} full mono />
                    <InfoField label="Phone"          value={org.phone} />
                    <InfoField label="Country"        value={org.country} />
                    <InfoField label="City"           value={org.city} />
                    <InfoField label="Address"        value={org.address} full />
                  </InfoSection>

                  <InfoSection title="Registration info">
                    <InfoField label="Registered on"  value={formatDate(org.created_at)} />
                    <InfoField label="Last updated"   value={formatDate(org.updated_at)} />
                    <InfoField label="Organisation code" value={org.code} mono />
                    <InfoField label="Type"           value={ORG_TYPE_LABELS[org.type] ?? org.type} />
                  </InfoSection>

                </div>

                {/* Right column */}
                <div className="view-org-col">

                  {/* Administrator accounts */}
                  <section className="info-section">
                    <h3 className="info-section__title">Administrator accounts</h3>
                    {org.users?.length > 0 ? (
                      <div className="admin-list">
                        {org.users.map((u) => (
                          <AdminCard key={u.id} user={u} />
                        ))}
                      </div>
                    ) : (
                      <p className="info-section__empty">No administrators found.</p>
                    )}
                  </section>

                  {/* Supporting documents */}
                  <section className="info-section">
                    <h3 className="info-section__title">Supporting documents</h3>
                    <div className="doc-list">
                      <DocCard label="Certificate of incorporation" url={org.doc_incorporation} />
                      <DocCard label="Letter of intent"             url={org.doc_letter_of_intent} />
                      <DocCard label="Accreditation document"       url={org.doc_accreditation} />
                    </div>
                  </section>

                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && MODALS[modal] && (
        <ConfirmModal
          {...MODALS[modal]}
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