import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../api/axios';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import './OrgRegister.css';

const STEPS = [
  { number: 1, label: 'Organisation' },
  { number: 2, label: 'Admin account' },
  { number: 3, label: 'Documents' },
];

const ORG_TYPES = [
  { value: 'UNIVERSITY', label: 'University' },
  { value: 'COLLEGE', label: 'College' },
  { value: 'PROFESSIONAL_BODY', label: 'Professional Body' },
  { value: 'TRAINING_INSTITUTE', label: 'Training Institute' },
];

const INITIAL_FORM = {
  // Step 1
  name: '',
  code: '',
  type: '',
  country: '',
  city: '',
  website: '',
  official_email: '',
  phone: '',
  address: '',
  // Step 2
  super_admin_name: '',
  super_admin_title: '',
  super_admin_email: '',
  super_admin_phone: '',
  password: '',
  confirm_password: '',
  // Step 3
  doc_incorporation: null,
  doc_letter_of_intent: null,
  doc_accreditation: null,
  agreed: false,
};

function StepIndicator({ current }) {
  return (
    <div className="reg-steps">
      {STEPS.map((step, idx) => {
        const state =
          step.number < current
            ? 'done'
            : step.number === current
            ? 'active'
            : 'pending';
        return (
          <div key={step.number} className="reg-step-item">
            <div className={`reg-step-bubble reg-step-bubble--${state}`}>
              {state === 'done' ? (
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : (
                step.number
              )}
            </div>
            <span className={`reg-step-label reg-step-label--${state}`}>
              {step.label}
            </span>
            {idx < STEPS.length - 1 && (
              <div className={`reg-step-line reg-step-line--${state === 'done' ? 'done' : 'pending'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FileDropzone({ id, label, hint, file, onChange, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped && dropped.type === 'application/pdf') onChange(dropped);
  }

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <div
        className={`dropzone ${dragging ? 'dropzone--drag' : ''} ${file ? 'dropzone--filled' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label={`Upload ${label}`}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept="application/pdf"
          className="dropzone__input"
          onChange={(e) => onChange(e.target.files[0] ?? null)}
          disabled={disabled}
        />
        {file ? (
          <div className="dropzone__filled">
            <div className="dropzone__file-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
                <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </div>
            <div className="dropzone__file-info">
              <span className="dropzone__file-name">{file.name}</span>
              <span className="dropzone__file-size">
                {(file.size / 1024).toFixed(0)} KB
              </span>
            </div>
            <button
              type="button"
              className="dropzone__remove"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              aria-label="Remove file"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="dropzone__empty">
            <div className="dropzone__upload-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 13V7M7 10l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 14.5A3.5 3.5 0 0 1 4 7.5a3.5 3.5 0 0 1 1.5-.3A5 5 0 0 1 15 8.5a3 3 0 0 1-.5 5.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <span className="dropzone__cta">
              Drop PDF here or <span className="dropzone__browse">browse</span>
            </span>
            <span className="dropzone__hint">{hint}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PasswordStrength({ password }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ];
  const score = checks.filter(Boolean).length;
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];
  const mod = ['', 'weak', 'fair', 'good', 'strong'][score];
  if (!password) return null;
  return (
    <div className="strength">
      <div className="strength__bars">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`strength__bar ${i < score ? `strength--${mod}` : ''}`} />
        ))}
      </div>
      <span className={`strength__label strength--${mod}`}>{label}</span>
    </div>
  );
}

// ── Field component ─────────────────────────────────────
// Moved outside to prevent recreation on each render
function Field({ id, label, type = 'text', placeholder, required = true, autoFocus, fieldErrors, form, handleChange, loading }) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label} {required && <span className="field__required">*</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        className={`field__input ${fieldErrors[id] ? 'field__input--error' : ''}`}
        placeholder={placeholder}
        value={form[id]}
        onChange={handleChange}
        autoFocus={autoFocus}
        disabled={loading}
      />
      {fieldErrors[id] && (
        <span className="field__error">{fieldErrors[id]}</span>
      )}
    </div>
  );
}

export default function OrgRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function setField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) setFieldErrors((prev) => ({ ...prev, [name]: '' }));
    if (globalError) setGlobalError('');
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setField(name, type === 'checkbox' ? checked : value);
  }

  // ── Validation ──────────────────────────────────────

  function validateStep1() {
    const e = {};
    if (!form.name.trim())           e.name           = 'Organisation name is required.';
    if (!form.code.trim())           e.code           = 'Organisation code is required.';
    else if (!/^[A-Z0-9]{2,10}$/.test(form.code.trim()))
                                     e.code           = 'Code must be 2–10 uppercase letters or digits.';
    if (!form.type)                  e.type           = 'Please select an organisation type.';
    if (!form.country.trim())        e.country        = 'Country is required.';
    if (!form.city.trim())           e.city           = 'City is required.';
    if (!form.official_email.trim()) e.official_email = 'Official email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.official_email))
                                     e.official_email = 'Please enter a valid email.';
    if (!form.phone.trim())          e.phone          = 'Phone number is required.';
    if(!parsePhoneNumberFromString(form.phone.trim())) e.phone  = 'Enter Valid phone number';
    if (!form.address.trim())        e.address        = 'Address is required.';
    return e;
  }

  function validateStep2() {
    const e = {};
    if (!form.super_admin_name.trim())  e.super_admin_name  = 'Full name is required.';
    if (!form.super_admin_title.trim()) e.super_admin_title = 'Job title is required.';
    if (!form.super_admin_email.trim()) e.super_admin_email = 'Email is required.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.super_admin_email))
                                        e.super_admin_email = 'Please enter a valid email.';
    if (!form.super_admin_phone.trim()) e.super_admin_phone = 'Phone number is required.';
    if (!form.password)                 e.password          = 'Password is required.';
    else if (form.password.length < 8)  e.password          = 'Password must be at least 8 characters.';
    if (!form.confirm_password)         e.confirm_password  = 'Please confirm your password.';
    else if (form.password !== form.confirm_password)
                                        e.confirm_password  = 'Passwords do not match.';
    return e;
  }

  function validateStep3() {
    const e = {};
    if (!form.doc_incorporation)    e.doc_incorporation    = 'Certificate of incorporation is required.';
    if (!form.doc_letter_of_intent) e.doc_letter_of_intent = 'Letter of intent is required.';
    if (!form.doc_accreditation)    e.doc_accreditation    = 'Accreditation document is required.';
    if (!form.agreed)               e.agreed               = 'You must agree to the terms to proceed.';
    return e;
  }

  function handleNext() {
    const errors = step === 1 ? validateStep1() : validateStep2();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }
    setFieldErrors({});
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleBack() {
    setFieldErrors({});
    setGlobalError('');
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errors = validateStep3();
    if (Object.keys(errors).length) { setFieldErrors(errors); return; }

    setLoading(true);
    setGlobalError('');

    try {
      const fd = new FormData();
      // Text fields
      const textFields = [
        'name', 'code', 'type', 'country', 'city', 'website',
        'official_email', 'phone', 'address',
        'super_admin_name', 'super_admin_title',
        'super_admin_email', 'super_admin_phone',
        'password', 'confirm_password',
      ];
      textFields.forEach((key) => fd.append(key, form[key]));
      // Files
      fd.append('doc_incorporation',    form.doc_incorporation);
      fd.append('doc_letter_of_intent', form.doc_letter_of_intent);
      fd.append('doc_accreditation',    form.doc_accreditation);

      await api.post('api/organisations/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/org-login');
    } catch (err) {
      const msg = err.response?.data?.message;
      if (err.response?.status === 409) {
        setGlobalError(msg ?? 'An organisation with this email or code already exists.');
      } else {
        setGlobalError('Something went wrong. Please check your details and try again.');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
    }
  }

  // ── Render ──────────────────────────────────────────

  return (
    <div className="reg-page">

      {/* Top bar */}
      <div className="reg-topbar">
        <div className="reg-logo">
          <span className="reg-logo__mark">⬡</span>
          <span className="reg-logo__text">Grad-Ledger</span>
        </div>
        <div className="reg-topbar__actions">
         <Link to="/" className="reg-topbar__link">
           Home
          </Link>
          <Link to="/org-login" className="reg-topbar__link">
            Already registered? Sign in
          </Link>
        </div>
      </div>

      <div className="reg-body">

        {/* Left — context panel */}
        <aside className="reg-aside">
          <div className="reg-aside__inner">
            <h2 className="reg-aside__title">
              Join Grad-Ledger
            </h2>
            <p className="reg-aside__sub">
              Register your institution to start issuing tamper-proof
              digital certificates anchored to the blockchain.
            </p>

            <ul className="reg-aside__list">
              {[
                ['Issue certificates', 'Upload PDFs and issue verifiable credentials to your students.'],
                ['Instant verification', 'Verifiers check authenticity in seconds — no calls, no paperwork.'],
                ['Full audit trail', 'Every action logged and traceable to an administrator.'],
              ].map(([title, desc]) => (
                <li key={title} className="reg-aside__item">
                  <div className="reg-aside__dot" aria-hidden="true" />
                  <div>
                    <strong>{title}</strong>
                    <p>{desc}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="reg-aside__note">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                <path d="M8 7v4M8 5h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Registration is reviewed by a Grad-Ledger administrator.
              You will receive an email once your organisation is approved.
            </div>
          </div>
        </aside>

        {/* Right — form */}
        <main className="reg-main">
          <StepIndicator current={step} />

          {/* Global error */}
          {globalError && (
            <div className="reg-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

            {/* ── Step 1: Basic + Contact ── */}
            {step === 1 && (
              <div className="reg-section">
                <div className="reg-section__header">
                  <h2 className="reg-section__title">Organisation details</h2>
                  <p className="reg-section__sub">Basic information about your institution.</p>
                </div>

                <div className="reg-grid">
                  <div className="reg-grid__full">
                    <Field id="name" label="Organisation name" placeholder="University of Yaoundé I" autoFocus fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="code">
                      Organisation code <span className="field__required">*</span>
                      <span className="field__hint">Uppercase letters/digits, 2–10 chars</span>
                    </label>
                    <input
                      id="code" name="code" type="text"
                      className={`field__input ${fieldErrors.code ? 'field__input--error' : ''}`}
                      placeholder="UY1"
                      value={form.code}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    {fieldErrors.code && <span className="field__error">{fieldErrors.code}</span>}
                  </div>

                  <div className="field">
                    <label className="field__label" htmlFor="type">
                      Type <span className="field__required">*</span>
                    </label>
                    <select
                      id="type" name="type"
                      className={`field__input field__select ${fieldErrors.type ? 'field__input--error' : ''}`}
                      value={form.type}
                      onChange={handleChange}
                      disabled={loading}
                    >
                      <option value="">Select type…</option>
                      {ORG_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                    {fieldErrors.type && <span className="field__error">{fieldErrors.type}</span>}
                  </div>

                  <Field id="country" label="Country" placeholder="Cameroon" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  <Field id="city" label="City" placeholder="Yaoundé" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />

                  <div className="reg-grid__full">
                    <Field id="website" label="Website" type="url" placeholder="https://www.institution.com" required={false} fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  </div>
                </div>

                <div className="reg-section__divider" />
                <div className="reg-section__header">
                  <h2 className="reg-section__title">Contact information</h2>
                  <p className="reg-section__sub">How we reach your institution officially.</p>
                </div>

                <div className="reg-grid">
                  <div className="reg-grid__full">
                    <Field id="official_email" label="Official email address" type="email" placeholder="info@institution.com" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  </div>
                  <Field id="phone" label="Phone number" type="tel" placeholder="+237 677 000 000" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  <div className="reg-grid__full">
                    <Field id="address" label="Physical address" placeholder="BP 337 Yaoundé, Cameroon" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 2: Super Admin account ── */}
            {step === 2 && (
              <div className="reg-section">
                <div className="reg-section__header">
                  <h2 className="reg-section__title">Administrator account</h2>
                  <p className="reg-section__sub">
                    This person will be the primary administrator for your organisation
                    and will manage all certificate operations.
                  </p>
                </div>

                <div className="reg-grid">
                  <Field id="super_admin_name" label="Full name" placeholder="Dr. Jean Paul Mbarga" autoFocus fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  <Field id="super_admin_title" label="Job title" placeholder="Registrar" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  <Field id="super_admin_email" label="Email address" type="email" placeholder="registrar@institution.com" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                  <Field id="super_admin_phone" label="Phone number" type="tel" placeholder="+237 677 000 000" fieldErrors={fieldErrors} form={form} handleChange={handleChange} loading={loading} />
                </div>

                <div className="reg-section__divider" />
                <div className="reg-section__header">
                  <h2 className="reg-section__title">Set a password</h2>
                  <p className="reg-section__sub">You will use this to sign in after approval.</p>
                </div>

                <div className="reg-grid reg-grid--single">

                  {/* Password */}
                  <div className="field">
                    <label className="field__label" htmlFor="password">
                      Password <span className="field__required">*</span>
                    </label>
                    <div className="field__input-wrapper">
                      <input
                        id="password" name="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`field__input field__input--with-action ${fieldErrors.password ? 'field__input--error' : ''}`}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button type="button" className="field__toggle" onClick={() => setShowPassword(v => !v)} tabIndex={-1} aria-label="Toggle password">
                        {showPassword
                          ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
                        }
                      </button>
                    </div>
                    <PasswordStrength password={form.password} />
                    {fieldErrors.password && <span className="field__error">{fieldErrors.password}</span>}
                  </div>

                  {/* Confirm password */}
                  <div className="field">
                    <label className="field__label" htmlFor="confirm_password">
                      Confirm password <span className="field__required">*</span>
                    </label>
                    <div className="field__input-wrapper">
                      <input
                        id="confirm_password" name="confirm_password"
                        type={showConfirm ? 'text' : 'password'}
                        className={`field__input field__input--with-action ${fieldErrors.confirm_password ? 'field__input--error' : ''}`}
                        placeholder="••••••••"
                        value={form.confirm_password}
                        onChange={handleChange}
                        autoComplete="new-password"
                        disabled={loading}
                      />
                      <button type="button" className="field__toggle" onClick={() => setShowConfirm(v => !v)} tabIndex={-1} aria-label="Toggle confirm password">
                        {showConfirm
                          ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/><path d="M4.2 4.3C2.8 5.2 1.7 6.5 1 8c1.3 2.8 4 4.5 7 4.5 1.3 0 2.5-.3 3.6-.9M7 3.5c.3 0 .7-.1 1-.1 3 0 5.7 1.7 7 4.5-.5 1-1.2 2-2.1 2.7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
                          : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8c1.3-2.8 4-4.5 7-4.5S13.7 5.2 15 8c-1.3 2.8-4 4.5-7 4.5S2.3 10.8 1 8Z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4"/></svg>
                        }
                      </button>
                    </div>
                    {fieldErrors.confirm_password && <span className="field__error">{fieldErrors.confirm_password}</span>}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Documents + Agreement ── */}
            {step === 3 && (
              <div className="reg-section">
                <div className="reg-section__header">
                  <h2 className="reg-section__title">Supporting documents</h2>
                  <p className="reg-section__sub">
                    Upload PDF copies of the following official documents.
                    Max file size 10 MB per document.
                  </p>
                </div>

                <div className="reg-docs">
                  <FileDropzone
                    id="doc_incorporation"
                    label="Certificate of incorporation"
                    hint="Official document confirming your institution's legal registration"
                    file={form.doc_incorporation}
                    onChange={(f) => setField('doc_incorporation', f)}
                    disabled={loading}
                  />
                  {fieldErrors.doc_incorporation && (
                    <span className="field__error">{fieldErrors.doc_incorporation}</span>
                  )}

                  <FileDropzone
                    id="doc_letter_of_intent"
                    label="Letter of intent"
                    hint="Signed letter stating your institution's intent to use Grad-Ledger"
                    file={form.doc_letter_of_intent}
                    onChange={(f) => setField('doc_letter_of_intent', f)}
                    disabled={loading}
                  />
                  {fieldErrors.doc_letter_of_intent && (
                    <span className="field__error">{fieldErrors.doc_letter_of_intent}</span>
                  )}

                  <FileDropzone
                    id="doc_accreditation"
                    label="Accreditation document"
                    hint="Proof of accreditation from the relevant national authority"
                    file={form.doc_accreditation}
                    onChange={(f) => setField('doc_accreditation', f)}
                    disabled={loading}
                  />
                  {fieldErrors.doc_accreditation && (
                    <span className="field__error">{fieldErrors.doc_accreditation}</span>
                  )}
                </div>

                <div className="reg-section__divider" />

                {/* Agreement */}
                <div className="reg-agreement">
                  <label className="reg-checkbox">
                    <input
                      type="checkbox"
                      name="agreed"
                      className="reg-checkbox__input"
                      checked={form.agreed}
                      onChange={handleChange}
                      disabled={loading}
                    />
                    <span className="reg-checkbox__box" aria-hidden="true" />
                    <span className="reg-checkbox__label">
                      I confirm that the information provided is accurate and that I am
                      authorised to register this organisation on Grad-Ledger. I agree to the{' '}
                      <a href="/terms" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </a>{' '}
                      and{' '}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </a>.
                    </span>
                  </label>
                  {fieldErrors.agreed && (
                    <span className="field__error" style={{ marginTop: 4, display: 'block' }}>
                      {fieldErrors.agreed}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── Navigation buttons ── */}
            <div className="reg-nav">
              {step > 1 && (
                <button
                  type="button"
                  className="reg-btn reg-btn--secondary"
                  onClick={handleBack}
                  disabled={loading}
                >
                  ← Back
                </button>
              )}
              <div className="reg-nav__spacer" />
              {step < 3 ? (
                <button
                  type="button"
                  className="reg-btn reg-btn--primary"
                  onClick={handleNext}
                  disabled={loading}
                >
                  Continue →
                </button>
              ) : (
                <button
                  type="submit"
                  className="reg-btn reg-btn--primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" aria-hidden="true" />
                      Submitting…
                    </>
                  ) : (
                    'Submit registration'
                  )}
                </button>
              )}
            </div>

          </form>
        </main>
      </div>
    </div>
  );
}