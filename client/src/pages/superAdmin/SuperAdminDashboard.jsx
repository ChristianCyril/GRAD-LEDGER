import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminSidebar from '../../components/SuperAdminSidebar';
import useApiPrivate from '../../hooks/useApiPrivate';
import './SuperAdminDashboard.css';

// ── Stat card ────────────────────────────────────────────
function StatCard({ label, value, sub, accent, icon, loading, delay = 0 }) {
  return (
    <div
      className="stat-card"
      style={{ '--accent': accent, animationDelay: `${delay}ms` }}
    >
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        <div className="stat-card__icon" aria-hidden="true">{icon}</div>
      </div>
      <div className="stat-card__value">
        {loading ? <span className="stat-card__skeleton" /> : value ?? '—'}
      </div>
      {sub && (
        <div className="stat-card__sub">{sub}</div>
      )}
      <div className="stat-card__bar" />
    </div>
  );
}

// ── Recent org row ───────────────────────────────────────
function OrgRow({ org, onAction }) {
  const STATUS_MAP = {
    APPROVED: { label: 'Approved', cls: 'badge--approved' },
    PENDING:  { label: 'Pending',  cls: 'badge--pending'  },
    REJECTED: { label: 'Rejected', cls: 'badge--rejected' },
    DISABLED: { label: 'Disabled', cls: 'badge--disabled' },
  };
  const s = STATUS_MAP[org.status] ?? { label: org.status, cls: '' };

  return (
    <div className="org-row">
      <div className="org-row__avatar" aria-hidden="true">
        {org.logo_url
          ? <img src={org.logo_url} alt={org.name} />
          : org.name?.[0]?.toUpperCase()
        }
      </div>
      <div className="org-row__info">
        <span className="org-row__name">{org.name}</span>
        <span className="org-row__meta">{org.type} · {org.country}</span>
      </div>
      <span className={`badge ${s.cls}`}>{s.label}</span>
      {org.status === 'PENDING' && (
        <button
          className="org-row__review"
          onClick={() => onAction(org.id)}
          aria-label={`Review ${org.name}`}
        >
          Review →
        </button>
      )}
    </div>
  );
}

// ── Main component ───────────────────────────────────────
export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const apiPrivate = useApiPrivate()
  const [sidebarOpen, setSidebarOpen]   = useState(false);
  const [analytics, setAnalytics]       = useState(null);
  const [recentOrgs, setRecentOrgs]     = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError('');
      try {
        const [analyticsRes, pendingRes, recentRes] = await Promise.all([
          apiPrivate.get('api/super-admin/analytics'),
          apiPrivate.get('api/super-admin/organisations/pending'),
          apiPrivate.get('api/super-admin/organisations?page=1&limit=5'),
        ]);
        setAnalytics(analyticsRes.data);
        setPendingCount(pendingRes.data?.length ?? 0);
        setRecentOrgs(recentRes.data?.data ?? []);
      } catch {
        setError('Failed to load dashboard data. Please refresh.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const stats = [
    {
      label: 'Total organisations',
      value: analytics?.totalOrganisations,
      sub: 'Registered on platform',
      accent: 'var(--teal-400)',
      delay: 0,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 13V6l6-4 6 4v7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <rect x="5.5" y="9" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
        </svg>
      ),
    },
    {
      label: 'Approved',
      value: analytics?.approved,
      sub: 'Active on platform',
      accent: 'var(--green-400)',
      delay: 60,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5 8l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Pending review',
      value: analytics?.pending,
      sub: pendingCount > 0 ? 'Awaiting your action' : 'No pending applications',
      accent: 'var(--amber-400)',
      delay: 120,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Rejected',
      value: analytics?.rejected,
      sub: 'Did not meet criteria',
      accent: 'var(--red-400)',
      delay: 180,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: 'Disabled',
      value: analytics?.disabled,
      sub: 'Suspended from platform',
      accent: 'var(--gray-400)',
      delay: 240,
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M4 8h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <div className="sa-dashboard">

      {/* Sidebar */}
      <SuperAdminSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        pendingCount={pendingCount}
      />

      {/* Main content — offset by sidebar width */}
      <div className="sa-dashboard__main">

        {/* Top bar */}
        <header className="sa-dashboard__topbar">
          <button
            className="sa-dashboard__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="ham-line" />
            <span className="ham-line" />
            <span className="ham-line" />
          </button>

          <div className="sa-dashboard__topbar-logo">
            <span style={{ color: 'var(--teal-400)', fontSize: 18 }}>⬡</span>
            <span className="sa-dashboard__topbar-name">Block-Ledger</span>
          </div>

          <div className="sa-dashboard__topbar-right">
            <span className="role-badge role--teal">Super Admin</span>
            <div className="sa-dashboard__avatar" aria-label="Super Admin">
              SA
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="sa-dashboard__content">

          {/* Page header */}
          <div className="sa-dash__header">
            <div>
              <p className="sa-dash__greeting">{greeting()}</p>
              <h1 className="sa-dash__title">Platform Overview</h1>
            </div>
            {pendingCount > 0 && (
              <button
                className="sa-dash__action"
                onClick={() => navigate('/super-admin/organisations/pending')}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {pendingCount} pending {pendingCount === 1 ? 'application' : 'applications'}
              </button>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="sa-dash__error" role="alert">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          {/* Stat cards */}
          <section aria-label="Platform statistics">
            <div className="sa-stats-grid">
              {stats.map((s) => (
                <StatCard key={s.label} {...s} loading={loading} />
              ))}
            </div>
          </section>

          {/* Recent organisations */}
          <section className="sa-dash__section" aria-label="Recent organisations">
            <div className="sa-dash__section-header">
              <h2 className="sa-dash__section-title">Recent organisations</h2>
              <button
                className="sa-dash__see-all"
                onClick={() => navigate('/super-admin/organisations')}
              >
                See all →
              </button>
            </div>

            <div className="sa-dash__card">
              {loading ? (
                <div className="sa-dash__skeleton-list">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="org-row-skeleton" />
                  ))}
                </div>
              ) : recentOrgs.length === 0 ? (
                <div className="sa-dash__empty">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
                    <path d="M4 26V12l12-8 12 8v14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <rect x="11" y="18" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  </svg>
                  <p>No organisations registered yet.</p>
                </div>
              ) : (
                <div className="sa-dash__org-list">
                  {recentOrgs.map((org) => (
                    <OrgRow
                      key={org.id}
                      org={org}
                      onAction={(id) => navigate('/super-admin/organisations/pending', { state: { selectedId: id } })}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Quick actions */}
          <section className="sa-dash__section" aria-label="Quick actions">
            <h2 className="sa-dash__section-title">Quick actions</h2>
            <div className="sa-quick-grid">
              {[
                {
                  label: 'Review pending',
                  desc: 'Approve or reject new applications',
                  to: '/super-admin/organisations/pending',
                  accent: 'var(--amber-400)',
                  bg: 'var(--amber-50)',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
                {
                  label: 'All organisations',
                  desc: 'Search, filter, and manage all orgs',
                  to: '/super-admin/organisations',
                  accent: 'var(--teal-400)',
                  bg: 'var(--teal-50)',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M2 13V6l6-4 6 4v7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                      <rect x="5.5" y="9" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  ),
                },
                {
                  label: 'Analytics',
                  desc: 'View platform growth and metrics',
                  to: '/super-admin/analytics',
                  accent: 'var(--blue-400)',
                  bg: 'var(--blue-50)',
                  icon: (
                    <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                      <path d="M1 12l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ),
                },
              ].map((action) => (
                <button
                  key={action.label}
                  className="sa-quick-card"
                  style={{ '--qa-accent': action.accent, '--qa-bg': action.bg }}
                  onClick={() => navigate(action.to)}
                >
                  <div className="sa-quick-card__icon">{action.icon}</div>
                  <div className="sa-quick-card__body">
                    <span className="sa-quick-card__label">{action.label}</span>
                    <span className="sa-quick-card__desc">{action.desc}</span>
                  </div>
                  <svg className="sa-quick-card__arrow" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}