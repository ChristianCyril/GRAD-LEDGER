import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import Header from '../../../components/Header';
import useApiPrivate from '../../../hooks/useApiPrivate';
import './OrgProfile.css';

// ── Helpers ──────────────────────────────────────────────

const ORG_TYPE_LABELS = {
  UNIVERSITY:         'University',
  COLLEGE:            'College',
  PROFESSIONAL_BODY:  'Professional Body',
  TRAINING_INSTITUTE: 'Training Institute',
};

const STATUS_CONFIG = {
  APPROVED: { label: 'Approved', cls: 'status--approved' },
  PENDING:  { label: 'Pending',  cls: 'status--pending'  },
  REJECTED: { label: 'Rejected', cls: 'status--rejected' },
  DISABLED: { label: 'Disabled', cls: 'status--disabled' },
};

function formatDate(str) {
  if (!str) return '—';
  return new Date(str).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
}

// ── Toast ─────────────────────────────────────────────────

function Toast({ message, type, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);
  return (
    <div className={`op-toast op-toast--${type}`} role="status" aria-live="polite">
      {type === 'success'
        ? <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
        : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      }
      {message}
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────

function EditProfileModal({ org, onSuccess, onCancel }) {
  const inputRef = useRef(null);
  const api = useApiPrivate()
  const [form, setForm] = useState({
    name:    org.name    ?? '',
    city:    org.city    ?? '',
    phone:   org.phone   ?? '',
    address: org.address ?? '',
    website: org.website ?? '',
  });
  const [logoFile,    setLogoFile]    = useState(null);
  const [logoPreview, setLogoPreview] = useState(org.logo_url ?? null);
  const [errors,      setErrors]      = useState({});
  const [apiError,    setApiError]    = useState('');
  const [loading,     setLoading]     = useState(false);
  const [dragging,    setDragging]    = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }));
    if (apiError) setApiError('');
  }

  function handleLogoChange(file) {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setErrors((p) => ({ ...p, logo: 'Logo must be a JPEG, PNG, or WebP image.' }));
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setErrors((p) => ({ ...p, logo: '' }));
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    handleLogoChange(e.dataTransfer.files[0]);
  }

  function removeLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  function validate() {
    const e = {};
    if (!form.name.trim())    e.name    = 'Organisation name is required.';
    if (!form.city.trim())    e.city    = 'City is required.';
    if (!form.phone.trim())   e.phone   = 'Phone number is required.';
    if (!form.address.trim()) e.address = 'Address is required.';
    if (form.website.trim() && !/^https?:\/\/.+/.test(form.website.trim())) {
      e.website = 'Please enter a valid URL starting with http:// or https://';
    }
    return e;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    setApiError('');
    try {
      const fd = new FormData();
      fd.append('name',    form.name.trim());
      fd.append('city',    form.city.trim());
      fd.append('phone',   form.phone.trim());
      fd.append('address', form.address.trim());
      fd.append('website', form.website.trim());
      if (logoFile) fd.append('logo', logoFile);

      const { data } = await api.patch('api/organisations/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSuccess(data.data);
    } catch (err) {
      setApiError(err.response?.data?.message ?? 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
      <div className="modal modal--edit">

        {/* Header */}
        <div className="modal__header">
          <div className="modal__icon modal__icon--blue" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
              <path d="M11 2a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8-8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="modal__header-text">
            <h2 className="modal__title" id="edit-modal-title">Update profile</h2>
            <p className="modal__sub">Changes are applied immediately after saving.</p>
          </div>
          <button className="modal__close" onClick={onCancel} disabled={loading} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Locked fields notice */}
        <div className="modal__locked-notice">
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <span>
            <strong>Country, type, official email</strong> and <strong>organisation code</strong> cannot
            be changed after registration.
          </span>
        </div>

        {/* API error */}
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

          {/* Logo upload */}
          <div className="field field--full">
            <span className="field__label">Organisation logo</span>
            <div
              className={`logo-drop ${dragging ? 'logo-drop--drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => !loading && inputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
              aria-label="Upload logo"
            >
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="logo-drop__input"
                onChange={(e) => handleLogoChange(e.target.files[0])}
                disabled={loading}
              />
              {logoPreview ? (
                <div className="logo-drop__preview">
                  <img src={logoPreview} alt="Logo preview" className="logo-drop__preview-img" />
                  <div className="logo-drop__preview-info">
                    <span className="logo-drop__preview-name">
                      {logoFile ? logoFile.name : 'Current logo'}
                    </span>
                    <span className="logo-drop__preview-hint">Click to change</span>
                  </div>
                  <button
                    type="button"
                    className="logo-drop__remove"
                    onClick={(e) => { e.stopPropagation(); removeLogo(); }}
                    aria-label="Remove logo"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="logo-drop__empty">
                  <div className="logo-drop__icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="2" width="16" height="16" rx="3" stroke="currentColor" strokeWidth="1.3" />
                      <circle cx="7" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M2 13l4-4 3 3 3-3 4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span className="logo-drop__cta">
                    Drop image or <span className="logo-drop__browse">browse</span>
                  </span>
                  <span className="logo-drop__hint">JPEG, PNG or WebP · max 10 MB</span>
                </div>
              )}
            </div>
            {errors.logo && <span className="field__error">{errors.logo}</span>}
          </div>

          {/* Fields grid */}
          <div className="modal__grid">

            <div className="field field--full">
              <label className="field__label" htmlFor="edit-name">
                Organisation name <span className="field__req">*</span>
              </label>
              <input
                id="edit-name" name="name" type="text"
                className={`field__input ${errors.name ? 'field__input--error' : ''}`}
                value={form.name}
                onChange={handleChange}
                placeholder="University of Yaoundé I"
                autoFocus
                disabled={loading}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="edit-city">
                City <span className="field__req">*</span>
              </label>
              <input
                id="edit-city" name="city" type="text"
                className={`field__input ${errors.city ? 'field__input--error' : ''}`}
                value={form.city}
                onChange={handleChange}
                placeholder="Yaoundé"
                disabled={loading}
              />
              {errors.city && <span className="field__error">{errors.city}</span>}
            </div>

            <div className="field">
              <label className="field__label" htmlFor="edit-phone">
                Phone <span className="field__req">*</span>
              </label>
              <input
                id="edit-phone" name="phone" type="tel"
                className={`field__input ${errors.phone ? 'field__input--error' : ''}`}
                value={form.phone}
                onChange={handleChange}
                placeholder="+237 677 000 000"
                disabled={loading}
              />
              {errors.phone && <span className="field__error">{errors.phone}</span>}
            </div>

            <div className="field field--full">
              <label className="field__label" htmlFor="edit-address">
                Address <span className="field__req">*</span>
              </label>
              <input
                id="edit-address" name="address" type="text"
                className={`field__input ${errors.address ? 'field__input--error' : ''}`}
                value={form.address}
                onChange={handleChange}
                placeholder="BP 337 Yaoundé, Cameroon"
                disabled={loading}
              />
              {errors.address && <span className="field__error">{errors.address}</span>}
            </div>

            <div className="field field--full">
              <label className="field__label" htmlFor="edit-website">
                Website
                <span className="field__optional">optional — clear to remove</span>
              </label>
              <input
                id="edit-website" name="website" type="url"
                className={`field__input ${errors.website ? 'field__input--error' : ''}`}
                value={form.website}
                onChange={handleChange}
                placeholder="https://www.institution.com"
                disabled={loading}
              />
              {errors.website && <span className="field__error">{errors.website}</span>}
            </div>

          </div>

          <div className="modal__actions">
            <button type="button" className="modal__btn modal__btn--cancel" onClick={onCancel} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="modal__btn modal__btn--save" disabled={loading}>
              {loading
                ? <><span className="op-spinner" aria-hidden="true" />Saving…</>
                : 'Save changes'
              }
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}

// ── Info field ────────────────────────────────────────────

function InfoField({ label, value, mono = false, full = false, link = false }) {
  if (!value) return null;
  return (
    <div className={`profile-field ${full ? 'profile-field--full' : ''}`}>
      <span className="profile-field__label">{label}</span>
      {link ? (
        <a
          className="profile-field__value profile-field__value--link"
          href={value} target="_blank" rel="noopener noreferrer"
        >
          {value} ↗
        </a>
      ) : (
        <span className={`profile-field__value ${mono ? 'profile-field__value--mono' : ''}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function DocItem({ label, url }) {
  const missing = !url;
  return (
    <div className={`doc-item ${missing ? 'doc-item--missing' : ''}`}>
      <div className="doc-item__icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
      <div className="doc-item__body">
        <span className="doc-item__name">{label}</span>
        {missing
          ? <span className="doc-item__missing">Not provided</span>
          : <a className="doc-item__link" href={url} target="_blank" rel="noopener noreferrer">Open PDF ↗</a>
        }
      </div>
      {!missing && (
        <div className="doc-item__check" aria-hidden="true">
          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </div>
  );
}

function SkeletonBlock({ width = '100%', height = 14 }) {
  return <div className="profile-skel" style={{ width, height }} />;
}

// ── Main ──────────────────────────────────────────────────

export default function OrgProfile() {
  const api = useApiPrivate()
  const { auth } = useAuth();
  const user = auth.user
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [org,         setOrg]         = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [editModal,   setEditModal]   = useState(false);
  const [toast,       setToast]       = useState(null);

  useEffect(() => {
    async function fetchOrg() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('api/organisations/profile');
        setOrg(data.data);
      } catch {
        setError('Failed to load organisation profile. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    fetchOrg();
  }, [api]);

  function handleUpdateSuccess(updatedOrg) {
    setOrg(updatedOrg);
    setEditModal(false);
    setToast({ message: 'Profile updated successfully.', type: 'success' });
  }

  const sc = STATUS_CONFIG[org?.status] ?? { label: org?.status, cls: '' };

  return (
    <div className="op-page">
      <OrgSuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        org={org}
      />

      <div className="op-page__main">
        <Header org={org} user={user} setSidebarOpen={setSidebarOpen} />

        <div className="op-content">

          {error && (
            <div className="op-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Hero */}
          <div className="op-hero">
            <div className="op-hero__logo">
              {loading ? (
                <div className="op-hero__logo-skeleton" />
              ) : org?.logo_url ? (
                <img src={org.logo_url} alt={org.name} />
              ) : (
                <span className="op-hero__logo-initial">
                  {org?.name?.[0]?.toUpperCase() ?? 'O'}
                </span>
              )}
            </div>

            <div className="op-hero__info">
              {loading ? (
                <>
                  <SkeletonBlock width={240} height={28} />
                  <SkeletonBlock width={160} height={14} />
                </>
              ) : (
                <>
                  <div className="op-hero__title-row">
                    <h1 className="op-hero__name">{org?.name}</h1>
                    <span className={`op-status-badge ${sc.cls}`}>{sc.label}</span>
                  </div>
                  <div className="op-hero__meta">
                    <span>{ORG_TYPE_LABELS[org?.type] ?? org?.type}</span>
                    <span className="op-hero__dot" />
                    <span>{org?.city}, {org?.country}</span>
                    <span className="op-hero__dot" />
                    <span className="op-hero__code">{org?.code}</span>
                  </div>
                  {org?.website && (
                    <a className="op-hero__website" href={org.website} target="_blank" rel="noopener noreferrer">
                      {org.website} ↗
                    </a>
                  )}
                </>
              )}
            </div>

            <div className="op-hero__actions">
              <button
                className="op-update-btn"
                onClick={() => setEditModal(true)}
                disabled={loading || !org}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M11 2a1.414 1.414 0 0 1 2 2L5 12l-3 1 1-3 8-8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
                Update profile
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="op-body">
            <div className="op-col">

              <section className="profile-section">
                <div className="profile-section__header">
                  <h3 className="profile-section__title">Organisation details</h3>
                </div>
                <div className="profile-section__grid">
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="profile-field">
                        <SkeletonBlock width={60} height={10} />
                        <SkeletonBlock width={120} height={14} />
                      </div>
                    ))
                  ) : (
                    <>
                      <InfoField label="Official email" value={org?.official_email} mono full />
                      <InfoField label="Phone"          value={org?.phone} />
                      <InfoField label="Country"        value={org?.country} />
                      <InfoField label="City"           value={org?.city} />
                      <InfoField label="Address"        value={org?.address} full />
                      {org?.website && <InfoField label="Website" value={org?.website} link full />}
                    </>
                  )}
                </div>
              </section>

              <section className="profile-section">
                <div className="profile-section__header">
                  <h3 className="profile-section__title">Registration info</h3>
                </div>
                <div className="profile-section__grid">
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="profile-field">
                        <SkeletonBlock width={60} height={10} />
                        <SkeletonBlock width={100} height={14} />
                      </div>
                    ))
                  ) : (
                    <>
                      <InfoField label="Registered on"     value={formatDate(org?.created_at)} />
                      <InfoField label="Last updated"      value={formatDate(org?.updated_at)} />
                      <InfoField label="Organisation code" value={org?.code} mono />
                      <InfoField label="Type"              value={ORG_TYPE_LABELS[org?.type] ?? org?.type} />
                    </>
                  )}
                </div>
              </section>

            </div>

            <div className="op-col">

              <section className="profile-section">
                <div className="profile-section__header">
                  <h3 className="profile-section__title">Supporting documents</h3>
                </div>
                <div className="op-docs">
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="doc-item">
                        <div className="doc-item__icon"><SkeletonBlock width={16} height={16} /></div>
                        <div className="doc-item__body">
                          <SkeletonBlock width={160} height={13} />
                          <SkeletonBlock width={60} height={11} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <DocItem label="Certificate of incorporation" url={org?.doc_incorporation} />
                      <DocItem label="Letter of intent"             url={org?.doc_letter_of_intent} />
                      <DocItem label="Accreditation document"       url={org?.doc_accreditation} />
                    </>
                  )}
                </div>
              </section>

              <section className="profile-section">
                <div className="profile-section__header">
                  <h3 className="profile-section__title">Your account</h3>
                  <button className="op-link-btn" onClick={() => navigate('/org/change-password')}>
                    Change password →
                  </button>
                </div>
                <div className="op-user-card">
                  <div className="op-user-card__avatar" aria-hidden="true">
                    {user?.full_name?.split(' ').filter(Boolean).slice(0, 2).map((n) => n[0].toUpperCase()).join('') ?? 'U'}
                  </div>
                  <div className="op-user-card__body">
                    <div className="op-user-card__top">
                      <span className="op-user-card__name">{user?.full_name}</span>
                      <span className="op-user-badge">Org Super Admin</span>
                    </div>
                    <span className="op-user-card__email">{user?.email}</span>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {editModal && org && (
        <EditProfileModal
          org={org}
          onSuccess={handleUpdateSuccess}
          onCancel={() => setEditModal(false)}
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