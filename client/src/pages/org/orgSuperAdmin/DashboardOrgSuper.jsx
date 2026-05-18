import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import OrgSuperAdminSidebar from '../../../components/OrgSuperAdminSidebar';
import './DashboardOrgSuper.css';
import Header from '../../../components/Header';
import useApiPrivate from '../../../hooks/useApiPrivate';

// ── Stat card ────────────────────────────────────────────

function StatCard({ label, value, sub, accent, bg, icon, loading, delay = 0 }) {
  return (
    <div
      className="osa-stat-card"
      style={{
        '--card-accent': accent,
        '--card-bg': bg,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="osa-stat-card__icon" aria-hidden="true">{icon}</div>
      <div className="osa-stat-card__body">
        <span className="osa-stat-card__label">{label}</span>
        <span className="osa-stat-card__value">
          {loading ? <span className="osa-skel osa-skel--value" /> : (value ?? '—')}
        </span>
        {sub && <span className="osa-stat-card__sub">{sub}</span>}
      </div>
      <div className="osa-stat-card__bar" />
    </div>
  );
}

// ── Recent certificate row ────────────────────────────────

function CertRow({ cert, onClick }) {
  const STATUS = {
    CONFIRMED: { label: 'Confirmed', cls: 'badge--confirmed' },
    PENDING:   { label: 'Pending',   cls: 'badge--pending'  },
    FAILED:    { label: 'Failed',    cls: 'badge--failed'   },
    REVOKED:   { label: 'Revoked',   cls: 'badge--revoked'  },
  };
  const s = STATUS[cert.status] ?? { label: cert.status, cls: '' };

  return (
    <button className="cert-row" onClick={onClick}>
      <div className="cert-row__avatar" aria-hidden="true">
        {cert.student?.full_name?.[0]?.toUpperCase() ?? '?'}
      </div>
      <div className="cert-row__info">
        <span className="cert-row__name">{cert.student?.full_name}</span>
        <span className="cert-row__meta">
          {cert.program} · {cert.year_of_graduation}
        </span>
      </div>
      <span className={`osa-badge ${s.cls}`}>{s.label}</span>
      <svg className="cert-row__chevron" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ── Quick action card ─────────────────────────────────────

function QuickAction({ label, desc, icon, accent, bg, onClick, delay }) {
  return (
    <button
      className="osa-quick"
      style={{ '--qa-accent': accent, '--qa-bg': bg, animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="osa-quick__icon" aria-hidden="true">{icon}</div>
      <div className="osa-quick__body">
        <span className="osa-quick__label">{label}</span>
        <span className="osa-quick__desc">{desc}</span>
      </div>
      <svg className="osa-quick__arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ── Admin row ─────────────────────────────────────────────

function AdminRow({ admin }) {
  const initials = admin.full_name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') ?? '?';

  return (
    <div className="admin-row">
      <div className="admin-row__avatar" aria-hidden="true">{initials}</div>
      <div className="admin-row__info">
        <span className="admin-row__name">{admin.full_name}</span>
        <span className="admin-row__title">{admin.job_title}</span>
      </div>
      <span className={`osa-badge ${admin.status === 'ACTIVE' ? 'badge--confirmed' : 'badge--revoked'}`}>
        {admin.status === 'ACTIVE' ? 'Active' : 'Disabled'}
      </span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────

export default function DashboardOrgSuper() {
  const { auth} = useAuth();
  const user = auth.user
  const navigate = useNavigate();
  const api = useApiPrivate()

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [org,          setOrg]          = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [recentCerts,  setRecentCerts]  = useState([]);
  const [admins,       setAdmins]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError('');
      try {
        const [orgRes, /*analyticsRes, certsRes,*/ adminsRes] = await Promise.all([
          api.get('/api/organisations/profile'),
          //api.get('/api/org/analytics'),
          //api.get('/api/certificates?page=1&limit=5'),
          api.get('/api/org-super-admin'),
        ]);
        setOrg(orgRes.data.data);
       // setAnalytics(analyticsRes.data.data);
        //setRecentCerts(certsRes.data?.data ?? []);
        setAdmins(adminsRes.data?.data);
      } catch {
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [api]);



  function greeting() {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }

  function firstName() {
    return user?.full_name?.split(' ')[0] ?? 'there';
  }

  const stats = [
    {
      label: 'Total issued',
      value: analytics?.totalIssued,
      sub: 'Certificates issued',
      accent: 'var(--blue-400)',
      bg: 'var(--blue-50)',
      delay: 0,
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Confirmed',
      value: analytics?.totalIssued - analytics?.totalPending - analytics?.totalFailed - analytics?.totalRevoked,
      sub: 'On blockchain',
      accent: 'var(--green-400)',
      bg: 'var(--green-50)',
      delay: 60,
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Pending',
      value: analytics?.totalPending,
      sub: 'Awaiting confirmation',
      accent: 'var(--amber-400)',
      bg: 'var(--amber-50)',
      delay: 120,
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Revoked',
      value: analytics?.totalRevoked,
      sub: 'No longer valid',
      accent: 'var(--red-400)',
      bg: 'var(--red-50)',
      delay: 180,
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  const quickActions = [
    {
      label: 'Issue certificate',
      desc: 'Upload a PDF and issue to a student',
      accent: 'var(--blue-400)',
      bg: 'var(--blue-50)',
      delay: 0,
      onClick: () => navigate('/org/certificates/issue'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'All certificates',
      desc: 'Browse, search and manage records',
      accent: 'var(--teal-400)',
      bg: 'var(--teal-50)',
      delay: 60,
      onClick: () => navigate('/org/certificates'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Manage admins',
      desc: 'Create or toggle administrator access',
      accent: 'var(--blue-600)',
      bg: 'var(--blue-50)',
      delay: 120,
      onClick: () => navigate('/org-super-admin/manage-admins'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
          <path d="M1 14c0-3 2-5 5-5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <path d="M11 10v4M9 12h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Audit log',
      desc: 'Review all actions in your organisation',
      accent: 'var(--gray-400)',
      bg: 'var(--gray-50)',
      delay: 180,
      onClick: () => navigate('/org/audit'),
      icon: (
        <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
          <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="osa-dashboard">
      <OrgSuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        org={org}
      />

      <div className="osa-dashboard__main">

        {/* Top bar */}
        <Header org = {org} user={user} setSidebarOpen= {setSidebarOpen}/>
        
        {/* Page content */}
        <div className="osa-dashboard__content">

          {/* Page header */}
          <div className="osa-dash__header">
            <div className="osa-dash__header-text">
              <p className="osa-dash__greeting">{greeting()}, {firstName()}</p>
              <h1 className="osa-dash__title">Dashboard</h1>
            </div>
            <button
              className="osa-dash__issue-btn"
              onClick={() => navigate('/org/certificates/issue')}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              Issue certificate
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="osa-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Stat cards */}
          <section aria-label="Certificate statistics">
            <div className="osa-stats-grid">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} loading={loading} />
              ))}
            </div>
          </section>

          {/* Lower grid — recent certs + admins */}
          <div className="osa-lower-grid">

            {/* Recent certificates */}
            <section className="osa-section" aria-label="Recent certificates">
              <div className="osa-section__header">
                <h2 className="osa-section__title">Recent certificates</h2>
                <button
                  className="osa-section__see-all"
                  onClick={() => navigate('/org/certificates')}
                >
                  See all →
                </button>
              </div>

              <div className="osa-card">
                {loading ? (
                  <div className="osa-skeleton-list">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="osa-skeleton-row" style={{ animationDelay: `${i * 60}ms` }} />
                    ))}
                  </div>
                ) : recentCerts.length === 0 ? (
                  <div className="osa-empty">
                    <div className="osa-empty__icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="2" width="18" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="osa-empty__text">No certificates issued yet.</p>
                    <button
                      className="osa-empty__cta"
                      onClick={() => navigate('/org/certificates/issue')}
                    >
                      Issue your first certificate
                    </button>
                  </div>
                ) : (
                  <div className="osa-cert-list">
                    {recentCerts.map((cert) => (
                      <CertRow
                        key={cert.id}
                        cert={cert}
                        onClick={() => navigate(`/org/certificates/${cert.id}`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Right column — quick actions + admins */}
            <div className="osa-right-col">

              {/* Quick actions */}
              <section aria-label="Quick actions">
                <h2 className="osa-section__title" style={{ marginBottom: 'var(--space-md)' }}>
                  Quick actions
                </h2>
                <div className="osa-quick-grid">
                  {quickActions.map((qa) => (
                    <QuickAction key={qa.label} {...qa} />
                  ))}
                </div>
              </section>

              {/* Admin team */}
              <section className="osa-section" aria-label="Admin team">
                <div className="osa-section__header">
                  <h2 className="osa-section__title">Admin team</h2>
                  <button
                    className="osa-section__see-all"
                    onClick={() => navigate('/org-super-admin/manage-admins')}
                  >
                    Manage →
                  </button>
                </div>

                <div className="osa-card">
                  {loading ? (
                    <div className="osa-skeleton-list">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="osa-skeleton-row" style={{ animationDelay: `${i * 60}ms` }} />
                      ))}
                    </div>
                  ) : admins.length === 0 ? (
                    <div className="osa-empty">
                      <div className="osa-empty__icon" aria-hidden="true">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M2 21c0-4 3-7 7-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                          <path d="M17 15v6M14 18h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </div>
                      <p className="osa-empty__text">No admins created yet.</p>
                      <button
                        className="osa-empty__cta"
                        onClick={() => navigate('/org/admins')}
                      >
                        Add an admin
                      </button>
                    </div>
                  ) : (
                    <div className="osa-admin-list">
                      {admins.slice(0, 4).map((admin) => (
                        <AdminRow key={admin.id} admin={admin} />
                      ))}
                    </div>
                  )}
                </div>
              </section>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}