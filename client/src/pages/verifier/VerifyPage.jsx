import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../api/axios';
import './VerifyPage.css';


/* ─── Helpers ────────────────────────────────────────── */

const fmtDate = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

/* ─── Icons ──────────────────────────────────────────── */

function CheckCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M14 24l7 7 13-14" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M16 16l16 16M32 16L16 32" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round"/>
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
      <path d="M24 6L44 40H4L24 6z" stroke="currentColor" strokeWidth="1.8"
        strokeLinejoin="round"/>
      <path d="M24 20v10M24 34v2" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round"/>
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 20V10M14 10L9 15M14 10l5 5" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 22h18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M10 5H6a2 2 0 00-2 2v14a2 2 0 002 2h16a2 2 0 002-2V7a2 2 0 00-2-2h-4l-2-2h-4L10 5z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="14" cy="14" r="4" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function IDIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect x="3" y="7" width="22" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="10" cy="14" r="3" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M16 12h6M16 16h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M4 2h7l5 5v9a1 1 0 01-1 1H4a1 1 0 01-1-1V3a1 1 0 011-1z"
        stroke="currentColor" strokeWidth="1.2"/>
      <path d="M11 2v5h5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function Spinner() {
  return <span className="vp-spinner" aria-label="Verifying…"/>;
}

/* ─── Result card ────────────────────────────────────── */

function DetailRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="vp-detail__row">
      <span className="vp-detail__key">{label}</span>
      <span className="vp-detail__val">{value}</span>
    </div>
  );
}

function ResultCard({ result, onReset }) {
  const { status, certificate: cert } = result;

  const configs = {
    VALID: {
      mod:      'valid',
      Icon:     CheckCircleIcon,
      headline: 'Certificate verified',
      sub:      'This document is authentic and has not been altered.',
    },
    REVOKED: {
      mod:      'revoked',
      Icon:     XCircleIcon,
      headline: 'Certificate revoked',
      sub:      'This certificate has been revoked by the issuing institution.',
    },
    TAMPERED: {
      mod:      'tampered',
      Icon:     WarningIcon,
      headline: 'Verification failed',
      sub:      'This document could not be verified. It may have been modified.',
    },
    NOT_FOUND: {
      mod:      'notfound',
      Icon:     WarningIcon,
      headline: 'Not found',
      sub:      'No record was found matching this certificate.',
    },
  };

  const cfg = configs[status] ?? configs.NOT_FOUND;

  return (
    <div className={`vp-result vp-result--${cfg.mod}`}>
      {/* Status header */}
      <div className="vp-result__head">
        <span className="vp-result__icon"><cfg.Icon /></span>
        <div>
          <h2 className="vp-result__headline">{cfg.headline}</h2>
          <p className="vp-result__sub">{cfg.sub}</p>
        </div>
      </div>

      {/* Certificate details — only for VALID and REVOKED */}
      {cert && (
        <div className="vp-detail">
          <div className="vp-detail__section">
            <span className="vp-detail__section-title">Recipient</span>
            <DetailRow label="Full name"   value={cert.studentName} />
            <DetailRow label="Matricule"   value={cert.matricule} />
          </div>

          <div className="vp-detail__section">
            <span className="vp-detail__section-title">Qualification</span>
            <DetailRow label="Program"     value={cert.program} />
            <DetailRow label="Department"  value={cert.department} />
            <DetailRow label="Graduated"   value={cert.yearOfGraduation} />
            <DetailRow label="GPA"         value={cert.gpa} />
          </div>

          <div className="vp-detail__section">
            <span className="vp-detail__section-title">Issuance</span>
            <DetailRow label="Issued by"   value={cert.issuingOrganisation} />
            <DetailRow label="Issued on"   value={fmtDate(cert.issuedAt)} />
            <DetailRow label="Certificate ID" value={cert.certId} />
          </div>

          {/* Revocation notice */}
          {status === 'REVOKED' && (
            <div className="vp-revoke-notice">
              <strong>Revoked on:</strong> {fmtDate(cert.revokedAt)}
              {cert.revokeReason && (
                <p className="vp-revoke-notice__reason">{cert.revokeReason}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Verify another */}
      <button className="vp-btn vp-btn--ghost vp-result__again" onClick={onReset}>
        Verify another certificate
      </button>
    </div>
  );
}

/* ─── Tab: Enter ID ──────────────────────────────────── */

function TabID({ onVerify, loading }) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) onVerify(value.trim());
  };

  return (
    <div className="vp-tab-pane">
      <p className="vp-tab-pane__hint">
        Enter the certificate ID found on the document or in the notification email.
      </p>
      <div className="vp-id-row">
        <input
          className="vp-input"
          type="text"
          placeholder="e.g. 3f7a1c2d-…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          autoComplete="off"
          spellCheck={false}
          aria-label="Certificate ID"
        />
        <button
          className="vp-btn vp-btn--primary"
          onClick={handleSubmit}
          disabled={loading || !value.trim()}
        >
          {loading ? <Spinner /> : <><SearchIcon /> Verify</>}
        </button>
      </div>
    </div>
  );
}

/* ─── Tab: Upload PDF ────────────────────────────────── */

function TabPDF({ onVerify, loading }) {
  const [file,    setFile]    = useState(null);
  const [fileErr, setFileErr] = useState('');
  const [drag,    setDrag]    = useState(false);
  const inputRef = useRef(null);

  const acceptFile = (f) => {
    setFileErr('');
    if (!f) return;
    if (f.type !== 'application/pdf') { setFileErr('Only PDF files are accepted'); return; }
    if (f.size > 10 * 1024 * 1024)   { setFileErr('File must be under 10 MB'); return; }
    setFile(f);
  };

  const handleSubmit = () => {
    if (file) onVerify(file);
  };

  return (
    <div className="vp-tab-pane">
      <p className="vp-tab-pane__hint">
        Upload the original certificate PDF. We'll verify its authenticity automatically.
      </p>

      <div
        className={`vp-drop ${drag ? 'vp-drop--drag' : ''} ${file ? 'vp-drop--filled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); acceptFile(e.dataTransfer.files[0]); }}
        onClick={() => !file && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !file && inputRef.current?.click()}
        aria-label="Upload PDF"
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={(e) => acceptFile(e.target.files[0])}
        />

        {!file ? (
          <div className="vp-drop__empty">
            <span className="vp-drop__icon"><UploadIcon /></span>
            <p className="vp-drop__prompt">
              Drop your PDF here or <span className="vp-link">browse</span>
            </p>
            <p className="vp-drop__hint">PDF only · max 10 MB</p>
          </div>
        ) : (
          <div className="vp-drop__preview">
            <span className="vp-drop__file-icon"><FileIcon /></span>
            <span className="vp-drop__file-name">{file.name}</span>
            <button
              className="vp-btn vp-btn--ghost vp-btn--sm"
              onClick={(e) => { e.stopPropagation(); setFile(null); }}
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {fileErr && <p className="vp-field-err">{fileErr}</p>}

      <button
        className="vp-btn vp-btn--primary vp-btn--full"
        onClick={handleSubmit}
        disabled={loading || !file}
      >
        {loading ? <><Spinner /> Verifying…</> : 'Verify document'}
      </button>
    </div>
  );
}

/* ─── Tab: QR Scanner ────────────────────────────────── */

function TabQR({ onVerify }) {
  const instanceRef  = useRef(null);
  const hasScannedRef = useRef(false);
  const [error, setError] = useState('');
  const [active, setActive] = useState(false);

  const stopScanner = useCallback(async () => {
    try {
      if (instanceRef.current) {
        await instanceRef.current.stop();
        instanceRef.current.clear();
        instanceRef.current = null;
      }
    } catch {}
    setActive(false);
  }, []);

  const startScanner = useCallback(async () => {
    setError('');
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      instanceRef.current = new Html5Qrcode('vp-qr-reader');
      await instanceRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText) => {
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          // Extract certId from URL or use raw value
          let certId = decodedText.trim();
          try {
            const url = new URL(decodedText);
            const parts = url.pathname.split('/');
            const idx = parts.indexOf('verify');
            if (idx !== -1 && parts[idx + 1]) certId = parts[idx + 1];
          } catch {}

          stopScanner();
          onVerify(certId);
        },
        () => {} // frame errors — ignore
      );
      setActive(true);
    } catch (err) {
      setError('Camera access denied or not available on this device.');
    }
  }, [onVerify, stopScanner]);

  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  return (
    <div className="vp-tab-pane">
      <p className="vp-tab-pane__hint">
        Point your camera at the QR code that was attached to the notification email.
      </p>

      <div className="vp-qr-wrap">
        {/* scanner mounts here */}
        <div id="vp-qr-reader" className="vp-qr-reader" />

        {!active && (
          <div className="vp-qr-placeholder">
            <span className="vp-qr-placeholder__icon"><CameraIcon /></span>
            <p>Camera is off</p>
          </div>
        )}
      </div>

      {error && <p className="vp-field-err">{error}</p>}

      <button
        className={`vp-btn ${active ? 'vp-btn--ghost' : 'vp-btn--primary'} vp-btn--full`}
        onClick={active ? stopScanner : startScanner}
      >
        {active ? 'Stop camera' : 'Start camera'}
      </button>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────── */

const TABS = [
  { id: 'id',  label: 'Certificate ID', Icon: IDIcon     },
  { id: 'pdf', label: 'Upload PDF',     Icon: UploadIcon },
  { id: 'qr',  label: 'Scan QR code',   Icon: CameraIcon },
];

export default function VerifyPage() {
  const { certId: urlCertId } = useParams();
  const navigate = useNavigate();

  const [tab,     setTab]     = useState('id');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');


  /* ── Verify by ID ── */
  const verifyById = async (id) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.get(`/api/verify/${id}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  /* Auto-verify when certId is in the URL */
  useEffect(() => {
    if (urlCertId) {
      verifyById(urlCertId);
    }
  }, [urlCertId]);

  

  /* ── Verify by PDF ── */
  const verifyByPDF = async (file) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('certificate_pdf', file);
      const res = await api.post('/api/verify/pdf', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message ?? 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* ── Handle tab verification ── */
  const handleVerify = (input) => {
    if (tab === 'pdf') verifyByPDF(input);
    else               verifyById(input);
  };

  /* ── Reset ── */
  const handleReset = () => {
    setResult(null);
    setError('');
    if (urlCertId) navigate('/verify', { replace: true });
  };

  const showInput = !result && !loading && !urlCertId;
  const showAutoLoading = loading && urlCertId;
   
  return (
    <div className="vp-page">
      {/* Header */}
      <header className="vp-header">
        <div className="vp-topbar">
          <div className="vp-logo">
            <span className="vp-logo__mark">⬡</span>
            <span className="vp-logo__text">Grad-Ledger</span>
          </div>
          <span className="vp-header__tag">Certificate verification</span>
        </div>
      </header>

      <main className="vp-main">
        <div className="vp-container">

          {/* Hero */}
          <div className="vp-hero">
            <h1 className="vp-hero__title">Verify a certificate</h1>
            <p className="vp-hero__sub">
              Instantly confirm the authenticity of any academic certificate
              issued through this platform.
            </p>
          </div>

          {/* Auto-loading state (certId in URL) */}
          {showAutoLoading && (
            <div className="vp-auto-loading">
              <Spinner />
              <p>Verifying certificate…</p>
            </div>
          )}

          {/* Global error */}
          {error && !result && (
            <div className="vp-error-banner" role="alert">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
              {error}
            </div>
          )}

          {/* Result */}
          {result && <ResultCard result={result} onReset={handleReset} />}

          {/* Input panel — only when no certId in URL and no result */}
          {showInput && (
            <div className="vp-card">
              {/* Tabs */}
              <div className="vp-tabs" role="tablist">
                {TABS.map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    className={`vp-tab ${tab === id ? 'vp-tab--active' : ''}`}
                    onClick={() => setTab(id)}
                  >
                    <Icon />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="vp-tab-content" role="tabpanel">
                {tab === 'id'  && <TabID  onVerify={handleVerify} loading={loading} />}
                {tab === 'pdf' && <TabPDF onVerify={handleVerify} loading={loading} />}
                {tab === 'qr'  && <TabQR  onVerify={handleVerify} />}
              </div>
            </div>
          )}

          {/* Loading inside card (manual verify) */}
          {loading && !urlCertId && (
            <div className="vp-card vp-card--loading">
              <Spinner />
              <p>Verifying…</p>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="vp-footer">
        <p>Certificates verified against an immutable public record &mdash; results are instant and tamper-proof.</p>
      </footer>
    </div>
  );
}