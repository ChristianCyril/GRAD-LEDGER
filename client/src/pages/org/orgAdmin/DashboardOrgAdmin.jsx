import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import OrgAdminSidebar from '../../../components/OrgSuperAdminSidebar'
import './DashboardOrgAdmin.css';
import Header from '../../../components/Header';
import useApiPrivate from '../../../hooks/useApiPrivate';

// ── Stat card ────────────────────────────────────────────

function StatCard({ label, value, sub, accent, bg, icon, loading, delay = 0 }) {
  return (
    <div
      className="oa-stat-card"
      style={{
        '--card-accent': accent,
        '--card-bg': bg,
        animationDelay: `${delay}ms`,
      }}
    >
      <div className="oa-stat-card__icon" aria-hidden="true">{icon}</div>
      <div className="oa-stat-card__body">
        <span className="oa-stat-card__label">{label}</span>
        <span className="oa-stat-card__value">
          {loading ? <span className="oa-skel oa-skel--value" /> : (value ?? '—')}
        </span>
        {sub && <span className="oa-stat-card__sub">{sub}</span>}
      </div>
      <div className="oa-stat-card__bar" />
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
      <span className={`oa-badge ${s.cls}`}>{s.label}</span>
    </button>
  );
}

// ── Quick action card ─────────────────────────────────────

function QuickAction({ label, desc, icon, accent, bg, onClick, delay }) {
  return (
    <button
      className="oa-quick"
      style={{ '--qa-accent': accent, '--qa-bg': bg, animationDelay: `${delay}ms` }}
      onClick={onClick}
    >
      <div className="oa-quick__icon" aria-hidden="true">{icon}</div>
      <div className="oa-quick__body">
        <span className="oa-quick__label">{label}</span>
        <span className="oa-quick__desc">{desc}</span>
      </div>
      <svg className="oa-quick__arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}


// ── Main ──────────────────────────────────────────────────

export default function DashboardOrgAdmin() {
  const { auth} = useAuth();
  const user = auth.user
  const navigate = useNavigate();
  const api = useApiPrivate()

  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [org,          setOrg]          = useState(null);
  const [analytics,    setAnalytics]    = useState(null);
  const [recentCerts,  setRecentCerts]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError('');
      try {
        const [orgRes, analyticsRes, certsRes] = await Promise.all([
          api.get('/api/organisations/profile'),
          api.get('/api/organisations/analytics'),
          api.get('/api/certificates?page=1&limit=5'),
        ]);
        setOrg(orgRes.data.data);
        setAnalytics(analyticsRes.data.data);
        setRecentCerts(certsRes.data?.data ?? []);
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
      value: analytics?.totalConfirmed,
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
    <div className="oa-dashboard">
      <OrgAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        org={org}
      />

      <div className="oa-dashboard__main">

        {/* Top bar */}
        <Header org = {org} user={user} setSidebarOpen= {setSidebarOpen}/>
        
        {/* Page content */}
        <div className="oa-dashboard__content">

          {/* Page header */}
          <div className="oa-dash__header">
            <div className="oa-dash__header-text">
              <p className="oa-dash__greeting">{greeting()}, {firstName()}</p>
              <h1 className="oa-dash__title">Dashboard</h1>
            </div>
            <button
              className="oa-dash__issue-btn"
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
            <div className="oa-error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Stat cards */}
          <section aria-label="Certificate statistics">
            <div className="oa-stats-grid">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} loading={loading} />
              ))}
            </div>
          </section>

          {/* Lower grid — recent certs + admins */}
          <div className="oa-lower-grid">

            {/* Recent certificates */}
            <section className="oa-section" aria-label="Recent certificates">
              <div className="oa-section__header">
                <h2 className="oa-section__title">Recent certificates</h2>
                <button
                  className="oa-section__see-all"
                  onClick={() => navigate('/org/certificates')}
                >
                  See all →
                </button>
              </div>

              <div className="oa-card">
                {loading ? (
                  <div className="oa-skeleton-list">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="oa-skeleton-row" style={{ animationDelay: `${i * 60}ms` }} />
                    ))}
                  </div>
                ) : recentCerts.length === 0 ? (
                  <div className="oa-empty">
                    <div className="oa-empty__icon" aria-hidden="true">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="3" y="2" width="18" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
                        <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      </svg>
                    </div>
                    <p className="oa-empty__text">No certificates issued yet.</p>
                    <button
                      className="oa-empty__cta"
                      onClick={() => navigate('/org/certificates/issue')}
                    >
                      Issue your first certificate
                    </button>
                  </div>
                ) : (
                  <div className="oa-cert-list">
                    {recentCerts.map((cert) => (
                      <CertRow
                        key={cert.id}
                        cert={cert}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Right column — quick actions + admins */}
            <div className="oa-right-col">

              {/* Quick actions */}
              <section aria-label="Quick actions">
                <h2 className="oa-section__title" style={{ marginBottom: 'var(--space-md)' }}>
                  Quick actions
                </h2>
                <div className="oa-quick-grid">
                  {quickActions.map((qa) => (
                    <QuickAction key={qa.label} {...qa} />
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}