import { useState, useEffect, useCallback, useRef } from 'react';
import useApiPrivate from '../../../hooks/useApiPrivate';
import { useAuth } from '../../../hooks/useAuth';
import Header from '../../../components/Header';
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import './CertificatesList.css';

/* ─── Constants ──────────────────────────────────────── */

const STATUS_OPTIONS = ['ALL', 'CONFIRMED', 'PENDING', 'FAILED', 'REVOKED'];
const PAGE_SIZE = 10;

/* ─── Helpers ────────────────────────────────────────── */

const fmt = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const fmtDateTime = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const truncateHash = (h) => (h ? `${h.slice(0, 10)}…${h.slice(-6)}` : '—');

/* ─── Status badge ───────────────────────────────────── */

function StatusBadge({ status }) {
  return (
    <span className={`cl-badge cl-badge--${status?.toLowerCase()}`}>
      {status}
    </span>
  );
}

/* ─── Email status dot ───────────────────────────────── */

function EmailDot({ status }) {
  const map = { SENT: 'sent', FAILED: 'failed', PENDING: 'pending' };
  const label = { SENT: 'Email sent', FAILED: 'Email failed', PENDING: 'Email pending' };
  return (
    <span
      className={`cl-email-dot cl-email-dot--${map[status] ?? 'pending'}`}
      title={label[status] ?? 'Unknown'}
    />
  );
}

/* ─── Icons ──────────────────────────────────────────── */

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M1 7.5C1 7.5 3.5 3 7.5 3S14 7.5 14 7.5 11.5 12 7.5 12 1 7.5 1 7.5z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 2v8M4.5 7.5l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function QRIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8.5" y="1.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="1.5" y="8.5" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="3" y="3" width="2" height="2" fill="currentColor" />
      <rect x="10" y="3" width="2" height="2" fill="currentColor" />
      <rect x="3" y="10" width="2" height="2" fill="currentColor" />
      <path d="M8.5 8.5h2v2h-2zM11.5 8.5h2v2h-2zM8.5 11.5h2v2h-2zM11.5 11.5h2v2h-2z" fill="currentColor" />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2 7a5 5 0 1 0 1-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M2 3v4h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="3" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
      <path d="M1 4l6 4 6-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M9 3L5 7.5 9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M6 3l4 4.5L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner({ size = 14, light = false }) {
  return (
    <span
      className="cl-spinner"
      style={{
        width: size, height: size,
        borderColor: light ? 'rgba(255,255,255,.35)' : 'var(--border-default)',
        borderTopColor: light ? '#fff' : 'var(--color-primary)',
      }}
      aria-label="Loading"
    />
  );
}

/* ─── Detail panel ───────────────────────────────────── */

function DetailRow({ label, value, mono, children }) {
  return (
    <div className="cl-detail__row">
      <span className="cl-detail__key label">{label}</span>
      <span className={`cl-detail__val ${mono ? 'text-mono' : ''}`}>
        {children ?? value ?? '—'}
      </span>
    </div>
  );
}

function DetailPanel({ cert, onClose, onRetry, onRetryEmail, retrying, retryingEmail }) {
  const panelRef = useRef(null);

  // trap focus / close on Escape
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const qrUrl = `${window.location.origin}/verify/${cert.id}`;

  const handleDownloadQR = async () => {
    try {
      const QRCode = (await import('qrcode')).default;
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `qr-${cert.id}.png`;
      a.click();
    } catch {
      window.open(qrUrl, '_blank');
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="cl-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Panel */}
      <aside
        ref={panelRef}
        className="cl-panel"
        role="dialog"
        aria-label="Certificate details"
        tabIndex={-1}
      >
        {/* Panel header */}
        <div className="cl-panel__head">
          <div>
            <p className="label" style={{ color: 'var(--color-primary)', marginBottom: 4 }}>
              Certificate
            </p>
            <h2 className="cl-panel__name">{cert.student?.full_name}</h2>
          </div>
          <div className="cl-panel__head-right">
            <StatusBadge status={cert.status} />
            <button className="cl-icon-btn" onClick={onClose} aria-label="Close panel">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="cl-panel__body">

          {/* Student section */}
          <div className="cl-detail__section">
            <span className="cl-detail__section-title label">Student</span>
            <DetailRow label="Full name"  value={cert.student?.full_name} />
            <DetailRow label="Matricule"  value={cert.student?.matricule} mono />
            <DetailRow label="Email"      value={cert.student?.email} />
          </div>

          {/* Academic section */}
          <div className="cl-detail__section">
            <span className="cl-detail__section-title label">Academic record</span>
            <DetailRow label="Department"         value={cert.department} />
            <DetailRow label="Program"            value={cert.program} />
            <DetailRow label="Year of entry"      value={cert.year_of_entry} />
            <DetailRow label="Year of graduation" value={cert.year_of_graduation} />
            <DetailRow label="GPA"                value={cert.gpa} />
          </div>

          {/* Record section */}
          <div className="cl-detail__section">
            <span className="cl-detail__section-title label">Record</span>
            <DetailRow label="Issued by"   value={`${cert.issued_by?.full_name} (${cert.issued_by?.job_title})`} />
            <DetailRow label="Issued on"   value={fmtDateTime(cert.issued_at)} />
            {cert.revoked_at && (
              <DetailRow label="Revoked on" value={fmtDateTime(cert.revoked_at)} />
            )}
            {cert.revoke_reason && (
              <DetailRow label="Revoke reason" value={cert.revoke_reason} />
            )}
            <DetailRow label="Certificate ID" value={cert.id} mono />
            <DetailRow label="Hash">
              <span className="text-mono cl-hash" title={cert.certificate_hash}>
                {truncateHash(cert.certificate_hash)}
              </span>
            </DetailRow>
            {cert.tx_hash && (
              <DetailRow label="Transaction">
                <span className="text-mono cl-hash" title={cert.tx_hash}>
                  {truncateHash(cert.tx_hash)}
                </span>
              </DetailRow>
            )}
          </div>

          {/* Email section */}
          <div className="cl-detail__section">
            <span className="cl-detail__section-title label">Notifications</span>
            <DetailRow label="Issuance email">
              <span className="cl-detail__email-status">
                <EmailDot status={cert.issuance_email_status} />
                <span>{cert.issuance_email_status}</span>
              </span>
            </DetailRow>
          </div>

          {/* Actions */}
          <div className="cl-panel__actions">
            {/* PDF download */}
            {cert.cloudinary_url && (
              <a
                href={cert.cloudinary_url}
                target="_blank"
                rel="noopener noreferrer"
                className="cl-btn cl-btn--secondary cl-btn--full"
                download
              >
                <DownloadIcon /> Download PDF
              </a>
            )}

            {/* QR download */}
            {cert.status === 'CONFIRMED' && (
              <button
                className="cl-btn cl-btn--secondary cl-btn--full"
                onClick={handleDownloadQR}
              >
                <QRIcon /> Download QR code
              </button>
            )}

            {/* Retry blockchain */}
            {cert.status === 'FAILED' && (
              <button
                className="cl-btn cl-btn--warning cl-btn--full"
                onClick={() => onRetry(cert.id)}
                disabled={retrying}
              >
                {retrying ? <><Spinner size={13} light /> Retrying…</> : <><RetryIcon /> Retry blockchain confirmation</>}
              </button>
            )}

            {/* Retry email */}
            {cert.issuance_email_status === 'FAILED' && cert.status === 'CONFIRMED' && (
              <button
                className="cl-btn cl-btn--ghost cl-btn--full"
                onClick={() => onRetryEmail(cert.id)}
                disabled={retryingEmail}
              >
                {retryingEmail ? <><Spinner size={13} /> Resending…</> : <><MailIcon /> Resend issuance email</>}
              </button>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}

/* ─── Toast ──────────────────────────────────────────── */

function Toast({ toast, onDismiss }) {
  if (!toast) return null;
  return (
    <div className={`cl-toast cl-toast--${toast.type}`} role="alert">
      <span className="cl-toast__msg">{toast.message}</span>
      <button className="cl-toast__close" onClick={onDismiss} aria-label="Dismiss">×</button>
    </div>
  );
}

/* ─── Empty state ────────────────────────────────────── */

function EmptyState({ filtered }) {
  return (
    <div className="cl-empty">
      <div className="cl-empty__icon">
        <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
          <rect x="8" y="6" width="24" height="28" rx="2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M14 14h12M14 19h12M14 24h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </div>
      <p className="cl-empty__title">
        {filtered ? 'No certificates match your filters' : 'No certificates yet'}
      </p>
      <p className="cl-empty__sub">
        {filtered
          ? 'Try a different search term or status filter.'
          : 'Issued certificates will appear here.'}
      </p>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */

export default function CertificatesList() {
  const [certs,        setCerts]        = useState([]);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [searchInput,  setSearchInput]  = useState('');
  const [status,       setStatus]       = useState('ALL');
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);   // cert obj for detail panel
  const [retrying,     setRetrying]     = useState(false);
  const [retryingEmail,setRetryingEmail]= useState(false);
  const [toast,        setToast]        = useState(null);
  const [org,          setOrg]          = useState(null);
  const [sidebarOpen,  setSidebarOpen]  = useState(false);

  const api        = useApiPrivate();
  const { auth }   = useAuth();
  const user       = auth.user;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const searchTimer = useRef(null);

  /* Fetch org profile */
  useEffect(() => {
    api.get('/api/organisations/profile')
      .then(r => setOrg(r.data.data))
      .catch(console.error);
  }, [api]);

  /* Toast helper */
  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  }, []);

  /* Fetch certificates */
  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search)          params.search = search;
      if (status !== 'ALL') params.status = status;

      const res = await api.get('/api/certificates', { params });
      setCerts(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      showToast('error', err.response?.data?.message ?? 'Failed to load certificates');
    } finally {
      setLoading(false);
    }
  }, [api, page, search, status, showToast]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  /* Debounced search */
  const handleSearchInput = (val) => {
    setSearchInput(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setSearch(val);
      setPage(1);
    }, 350);
  };

  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(1);
  };

  /* Retry blockchain */
  const handleRetry = async (certId) => {
    setRetrying(true);
    try {
      await api.post(`/api/certificates/${certId}/retry`);
      showToast('success', 'Certificate confirmed on the blockchain.');
      await fetchCerts();
      // refresh panel data
      setSelected(prev => prev ? { ...prev, status: 'CONFIRMED' } : prev);
    } catch (err) {
      showToast('error', err.response?.data?.message ?? 'Retry failed. Please try again.');
    } finally {
      setRetrying(false);
    }
  };

  /* Retry email */
  const handleRetryEmail = async (certId) => {
    setRetryingEmail(true);
    try {
      await api.post(`/api/certificates/${certId}/resend-email`);
      showToast('success', 'Issuance email resent successfully.');
      await fetchCerts();
      setSelected(prev => prev ? { ...prev, issuance_email_status: 'SENT' } : prev);
    } catch (err) {
      showToast('error', err.response?.data?.message ?? 'Failed to resend email.');
    } finally {
      setRetryingEmail(false);
    }
  };

  /* Open panel */
  const openPanel = (cert) => setSelected(cert);
  const closePanel = () => setSelected(null);

  const isFiltered = search !== '' || status !== 'ALL';

  return (
    <div className="cl-wrapper">
      <OrgSuperAdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} org={org} />
      <div className="cl-main">
        <Header org={org} user={user} setSidebarOpen={setSidebarOpen} />

        <div className="cl-page">
          {/* Page header */}
          <div className="cl-page__head">
            <div>
              <p className="label" style={{ color: 'var(--color-primary)', marginBottom: 4 }}>Certificates</p>
              <h1 className="cl-page__title">All certificates</h1>
            </div>
            <p className="cl-page__count text-muted">
              {loading ? '—' : `${total} total`}
            </p>
          </div>

          {/* Controls */}
          <div className="cl-controls">
            <div className="cl-search">
              <span className="cl-search__icon"><SearchIcon /></span>
              <input
                className="cl-search__input"
                type="text"
                placeholder="Search by name, email, or matricule…"
                value={searchInput}
                onChange={(e) => handleSearchInput(e.target.value)}
                aria-label="Search certificates"
              />
            </div>

            <div className="cl-filters">
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  className={`cl-filter-btn ${status === s ? 'cl-filter-btn--active' : ''}`}
                  onClick={() => handleStatusChange(s)}
                >
                  {s === 'ALL' ? 'All statuses' : s}
                </button>
              ))}
            </div>
          </div>

          {/* Table card */}
          <div className="cl-card">
            {loading ? (
              <div className="cl-loading">
                <Spinner size={22} />
              </div>
            ) : certs.length === 0 ? (
              <EmptyState filtered={isFiltered} />
            ) : (
              <>
                <div className="cl-table-wrap">
                  <table className="cl-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Program</th>
                        <th>Graduation</th>
                        <th>Issued</th>
                        <th>Status</th>
                        <th>Email</th>
                        <th aria-label="Actions" />
                      </tr>
                    </thead>
                    <tbody>
                      {certs.map((cert) => (
                        <tr
                          key={cert.id}
                          className={selected?.id === cert.id ? 'cl-table__row--selected' : ''}
                          onClick={() => openPanel(cert)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td>
                            <div className="cl-table__student">
                              <span className="cl-table__name">{cert.student?.full_name}</span>
                              <span className="cl-table__matricule text-mono text-muted">
                                {cert.student?.matricule}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="cl-table__program">
                              <span>{cert.program}</span>
                              <span className="text-muted" style={{ fontSize: 12 }}>{cert.department}</span>
                            </div>
                          </td>
                          <td>{cert.year_of_graduation}</td>
                          <td>{fmt(cert.issued_at)}</td>
                          <td><StatusBadge status={cert.status} /></td>
                          <td>
                            <EmailDot status={cert.issuance_email_status} />
                          </td>
                          <td onClick={(e) => e.stopPropagation()}>
                            <button
                              className="cl-view-btn"
                              onClick={() => openPanel(cert)}
                              aria-label={`View details for ${cert.student?.full_name}`}
                            >
                              <EyeIcon /> View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="cl-pagination">
                    <span className="cl-pagination__info text-muted">
                      Page {page} of {totalPages}
                    </span>
                    <div className="cl-pagination__btns">
                      <button
                        className="cl-icon-btn"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        aria-label="Previous page"
                      >
                        <ChevronLeftIcon />
                      </button>
                      <button
                        className="cl-icon-btn"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
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

      {/* Detail panel */}
      {selected && (
        <DetailPanel
          cert={selected}
          onClose={closePanel}
          onRetry={handleRetry}
          onRetryEmail={handleRetryEmail}
          retrying={retrying}
          retryingEmail={retryingEmail}
        />
      )}

      {/* Toast */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}