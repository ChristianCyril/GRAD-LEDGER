import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './SuperAdminSidebar.css';

const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [
      {
        to: '/super-admin/dashboard',
        label: 'Dashboard',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Organisations',
    items: [
      {
        to: '/super-admin/organisations/pending',
        label: 'Pending review',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v3.5l2 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        badge: 'pending',
      },
      {
        to: '/super-admin/organisations',
        label: 'All organisations',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 13V6l6-4 6 4v7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <rect x="5.5" y="9" width="5" height="4" rx="1" stroke="currentColor" strokeWidth="1.3" />
          </svg>
        ),
      },
      {
        to: '/super-admin/organisations/rejected',
        label: 'Rejected organisations',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 13V6l6-4 6 4v7" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6 7.5l4 4M10 7.5l-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Platform',
    items: [
      {
        to: '/super-admin/analytics',
        label: 'Analytics',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M1 12l4-4 3 3 4-5 3 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
      },
    ],
  },
];

export default function SuperAdminSidebar({ open, onClose, pendingCount = 0 }) {
  const { auth, logout } = useAuth();
  const user = auth.user;


  async function handleLogout() {
    await logout();

  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sa-sidebar ${open ? 'sa-sidebar--open' : ''}`}>

        {/* Logo */}
        <div className="sa-sidebar__logo">
          <span className="sa-sidebar__logo-mark">⬡</span>
          <span className="sa-sidebar__logo-text">Grad-Ledger</span>
          <button
            className="sa-sidebar__close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* User identity */}
        <div className="sa-sidebar__user">
          <div className="sa-sidebar__avatar" aria-hidden="true">
            SA
          </div>
          <div className="sa-sidebar__user-info">
            <span className="sa-sidebar__user-name">Super Admin</span>
            <span className="sa-sidebar__user-email">{user?.email}</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="sa-sidebar__nav" aria-label="Super admin navigation">
          {NAV_ITEMS.map((group) => (
            <div key={group.group} className="sa-nav-group">
              <span className="sa-nav-group__label">{group.group}</span>
              <ul className="sa-nav-list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.to === '/super-admin/dashboard' ||
                        item.to === '/super-admin/organisations'}
                      className={({ isActive }) =>
                        `sa-nav-item ${isActive ? 'sa-nav-item--active' : ''}`
                      }
                      onClick={() => { if (window.innerWidth < 768) onClose(); }}
                    >
                      <span className="sa-nav-item__icon">{item.icon}</span>
                      <span className="sa-nav-item__label">{item.label}</span>
                      {item.badge === 'pending' && pendingCount > 0 && (
                        <span className="sa-nav-item__badge">
                          {pendingCount > 99 ? '99+' : pendingCount}
                        </span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="sa-sidebar__bottom">
          <NavLink
            to="/super-admin/change-password"
            className={({ isActive }) =>
              `sa-bottom-item ${isActive ? 'sa-bottom-item--active' : ''}`
            }
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Change password
          </NavLink>

          <button className="sa-bottom-item sa-bottom-item--logout" onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              <path d="M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Log out
          </button>
        </div>

      </aside>
    </>
  );
}