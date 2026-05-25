import { useState, useRef, useCallback, useEffect } from 'react';
import useApiPrivate from '../../../hooks/useApiPrivate';
import './IssueCertificate.css';
import Header from '../../../components/Header';
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import { useAuth } from '../../../hooks/useAuth';

/* ─── Constants ─────────────────────────────────────── */

const TOTAL_STEPS = 3;

const FIELD_META = {
  full_name: { label: 'Full name', type: 'text', placeholder: 'e.g. John Doe' },
  matricule: { label: 'Matricule', type: 'text', placeholder: 'e.g. UY1-2021-0001' },
  email: { label: 'Student email', type: 'email', placeholder: 'student@example.com' },
  department: { label: 'Department', type: 'text', placeholder: 'e.g. Computer Science' },
  program: { label: 'Program', type: 'text', placeholder: 'e.g. B.Sc. Software Engineering' },
  year_of_entry: { label: 'Year of entry', type: 'number', placeholder: 'e.g. 2019' },
  year_of_graduation: { label: 'Year of graduation', type: 'number', placeholder: 'e.g. 2023' },
  gpa: { label: 'GPA', type: 'number', placeholder: 'e.g. 3.75', step: '0.01', min: '0', max: '4' },
};

const STEP_1_FIELDS = ['full_name', 'matricule', 'email', 'department', 'program'];
const STEP_1_ROW2 = ['year_of_entry', 'year_of_graduation', 'gpa'];

const emptyForm = () => ({
  full_name: '', matricule: '', email: '',
  department: '', program: '',
  year_of_entry: '', year_of_graduation: '', gpa: '',
});

/* ─── Helpers ───────────────────────────────────────── */

const isStep2Valid = (file) => file !== null;

/* ─── Sub-components ─────────────────────────────────── */

function StepIndicator({ current }) {
  const steps = ['Student details', 'Certificate PDF', 'Confirm & issue'];
  return (
    <div className="ic-steps">
      {steps.map((label, i) => {
        const num = i + 1;
        const done = num < current;
        const active = num === current;
        return (
          <div key={num} className={`ic-step ${active ? 'ic-step--active' : ''} ${done ? 'ic-step--done' : ''}`}>
            <div className="ic-step__bubble">
              {done
                ? <CheckIcon />
                : <span>{num}</span>}
            </div>
            <span className="ic-step__label">{label}</span>
            {i < steps.length - 1 && <div className="ic-step__connector" />}
          </div>
        );
      })}
    </div>
  );
}

function FieldInput({ name, value, onChange, error }) {
  const meta = FIELD_META[name];
  return (
    <div className={`ic-field ${error ? 'ic-field--error' : ''}`}>
      <label className="ic-field__label label" htmlFor={`ic-${name}`}>{meta.label}</label>
      <input
        id={`ic-${name}`}
        className="ic-field__input"
        type={meta.type}
        placeholder={meta.placeholder}
        step={meta.step}
        min={meta.min}
        max={meta.max}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        autoComplete="off"
      />
      {error && <span className="ic-field__error">{error}</span>}
    </div>
  );
}

function SummaryRow({ label, value, mono }) {
  return (
    <div className="ic-summary__row">
      <span className="ic-summary__key label">{label}</span>
      <span className={`ic-summary__val ${mono ? 'text-mono' : ''}`}>{value || '—'}</span>
    </div>
  );
}

/* ─── Icons ─────────────────────────────────────────── */

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Spinner() {
  return <span className="ic-spinner" aria-label="Loading" />;
}

function UploadIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 22V10M16 10L11 15M16 10L21 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="4" y="24" width="24" height="4" rx="2" fill="currentColor" opacity=".15" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M5 2h7l5 5v11a1 1 0 01-1 1H5a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" />
      <path d="M12 2v5h5" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M9 2L16.5 15H1.5L9 2z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M9 8v3M9 13v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <circle cx="9" cy="9" r="7.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 9l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Main component ─────────────────────────────────── */

export default function IssueCertificate() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [file, setFile] = useState(null);
  const [org, setOrg] = useState(null);
  const [fileErr, setFileErr] = useState('');
  const [drag, setDrag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);  // { type: 'success'|'warning'|'error', message }
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const api = useApiPrivate()
  const { auth } = useAuth();
  const user = auth.user
  const fileInputRef = useRef(null);


  useEffect(() => {
    async function fetchAll() {
      try {
        const orgRes = await api.get('/api/organisations/profile')
        setOrg(orgRes.data.data);
      } catch (err) {
        console.error(err)
      }
    }
    fetchAll();
  }, [api]);


  /* Field change */
  const handleChange = useCallback((name, value) => {
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((e) => ({ ...e, [name]: '' }));
  }, []);

  /* Step 1 validation */
  const validateStep1 = () => {
    const newErrors = {};
    [...STEP_1_FIELDS, ...STEP_1_ROW2].forEach((k) => {
      if (!String(form[k]).trim()) newErrors[k] = 'This field is required';
    });
    if (form.gpa && (parseFloat(form.gpa) < 0 || parseFloat(form.gpa) > 4))
      newErrors.gpa = 'GPA must be between 0 and 4';
    if (form.year_of_entry && form.year_of_graduation) {
      if (parseInt(form.year_of_graduation) <= parseInt(form.year_of_entry))
        newErrors.year_of_graduation = 'Must be after year of entry';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* File handling */
  const acceptFile = (f) => {
    setFileErr('');
    if (!f) return;
    if (f.type !== 'application/pdf') { setFileErr('Only PDF files are accepted'); return; }
    if (f.size > 10 * 1024 * 1024) { setFileErr('File must be under 10 MB'); return; }
    setFile(f);
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDrag(false);
    acceptFile(e.dataTransfer.files[0]);
  };

  /* Navigation */
  const goNext = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !isStep2Valid(file)) { setFileErr('Please upload the certificate PDF'); return; }
    setStep((s) => s + 1);
  };
  const goBack = () => setStep((s) => s - 1);

  /* Reset */
  const reset = () => {
    setStep(1); setForm(emptyForm()); setErrors({});
    setFile(null); setFileErr(''); setToast(null);
  };

  /* Submit */
  const handleSubmit = async () => {
    setLoading(true);
    setToast(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('certificate_pdf', file);

      const res = await api.post('/api/certificates', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.status === 201) {
        setToast({ type: 'success', message: 'Certificate issued successfully. The student will receive an email.' });
        setTimeout(reset, 4000);
      } else if (res.status === 202) {
        setToast({
          type: 'warning',
          message: 'Certificate recorded but blockchain confirmation is pending. Use the retry option from the certificates list.',
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Something went wrong. Please try again.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ── */
  return (
    <div className="ic-wrapper">
      <OrgSuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        org={org}
      />
      <div className="ic-main">
        <Header org={org} user={user} setSidebarOpen={setSidebarOpen} />
        <div className="ic-page">

          {/* Top bar */}

          <header className="ic-header">
            <div className="ic-header__eyebrow label">Certificates</div>
            <h1 className="ic-header__title">Issue certificate</h1>
            <p className="ic-header__sub">Complete all three steps to issue and record a new academic certificate.</p>
          </header>

          <div className="ic-card">
            <StepIndicator current={step} />

            <div className="ic-body">
              {/* ── Step 1 ── */}
              {step === 1 && (
                <div className="ic-pane" key="step1">
                  <h2 className="ic-pane__title">Student details</h2>
                  <p className="ic-pane__sub">Enter the student's personal and academic information.</p>

                  <div className="ic-fields ic-fields--2col">
                    {STEP_1_FIELDS.map((name) => (
                      <FieldInput key={name} name={name} value={form[name]}
                        onChange={handleChange} error={errors[name]} />
                    ))}
                  </div>

                  <div className="ic-divider" />

                  <div className="ic-fields ic-fields--3col">
                    {STEP_1_ROW2.map((name) => (
                      <FieldInput key={name} name={name} value={form[name]}
                        onChange={handleChange} error={errors[name]} />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <div className="ic-pane" key="step2">
                  <h2 className="ic-pane__title">Certificate PDF</h2>
                  <p className="ic-pane__sub">Upload the official PDF. A hash will be computed and recorded.</p>

                  <div
                    className={`ic-dropzone ${drag ? 'ic-dropzone--drag' : ''} ${file ? 'ic-dropzone--filled' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={handleDrop}
                    onClick={() => !file && fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && !file && fileInputRef.current?.click()}
                    aria-label="Upload PDF"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="application/pdf"
                      className="ic-dropzone__input"
                      onChange={(e) => acceptFile(e.target.files[0])}
                    />

                    {!file ? (
                      <div className="ic-dropzone__empty">
                        <span className="ic-dropzone__icon"><UploadIcon /></span>
                        <p className="ic-dropzone__prompt">
                          Drag and drop a PDF here, or <span className="ic-dropzone__link">browse</span>
                        </p>
                        <p className="ic-dropzone__hint">PDF only · max 10 MB</p>
                      </div>
                    ) : (
                      <div className="ic-dropzone__preview">
                        <span className="ic-dropzone__file-icon"><FileIcon /></span>
                        <div className="ic-dropzone__file-info">
                          <span className="ic-dropzone__file-name">{file.name}</span>
                          <span className="ic-dropzone__file-size text-muted">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                        <div className="ic-dropzone__actions">
                          <a
                            href={URL.createObjectURL(file)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ic-link"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Preview
                          </a>
                          <button
                            className="ic-btn ic-btn--ghost ic-btn--sm"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {fileErr && (
                    <p className="ic-field__error ic-field__error--standalone">{fileErr}</p>
                  )}
                </div>
              )}

              {/* ── Step 3 ── */}
              {step === 3 && (
                <div className="ic-pane" key="step3">
                  <h2 className="ic-pane__title">Confirm & issue</h2>
                  <p className="ic-pane__sub">Review all details before issuing. This action cannot be undone.</p>

                  <div className="ic-summary">
                    <div className="ic-summary__section">
                      <span className="ic-summary__section-title label">Student</span>
                      <SummaryRow label="Full name" value={form.full_name} />
                      <SummaryRow label="Matricule" value={form.matricule} mono />
                      <SummaryRow label="Email" value={form.email} />
                    </div>

                    <div className="ic-summary__section">
                      <span className="ic-summary__section-title label">Academic record</span>
                      <SummaryRow label="Department" value={form.department} />
                      <SummaryRow label="Program" value={form.program} />
                      <SummaryRow label="Year of entry" value={form.year_of_entry} />
                      <SummaryRow label="Year of graduation" value={form.year_of_graduation} />
                      <SummaryRow label="GPA" value={form.gpa} />
                    </div>

                    <div className="ic-summary__section">
                      <span className="ic-summary__section-title label">Certificate file</span>
                      <div className="ic-summary__row">
                        <span className="ic-summary__key label">File</span>
                        <span className="ic-summary__val ic-summary__file">
                          <FileIcon />
                          <span>{file?.name}</span>
                          <a
                            href={file ? URL.createObjectURL(file) : '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ic-link"
                          >
                            Preview
                          </a>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warning banner if blockchain pending */}
                  {toast?.type === 'warning' && (
                    <div className="ic-banner ic-banner--warning" role="alert">
                      <WarningIcon />
                      <p>{toast.message}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Footer nav ── */}
            <div className="ic-footer">
              <div className="ic-footer__left">
                {step > 1 && (
                  <button className="ic-btn ic-btn--secondary" onClick={goBack} disabled={loading}>
                    Back
                  </button>
                )}
              </div>
              <div className="ic-footer__right">
                {step < TOTAL_STEPS && (
                  <button className="ic-btn ic-btn--primary" onClick={goNext}>
                    Continue
                  </button>
                )}
                {step === TOTAL_STEPS && (
                  <button
                    className="ic-btn ic-btn--primary"
                    onClick={handleSubmit}
                    disabled={loading}
                  >
                    {loading ? <><Spinner /> Issuing…</> : 'Issue certificate'}
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Toast */}
          {toast && (
            <div className={`ic-toast ic-toast--${toast.type}`} role="alert">
              <span className="ic-toast__icon">
                {toast.type === 'success' && <SuccessIcon />}
                {toast.type === 'warning' && <WarningIcon />}
                {toast.type === 'error' && <WarningIcon />}
              </span>
              <span className="ic-toast__msg">{toast.message}</span>
              <button className="ic-toast__close" onClick={() => setToast(null)} aria-label="Dismiss">×</button>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}