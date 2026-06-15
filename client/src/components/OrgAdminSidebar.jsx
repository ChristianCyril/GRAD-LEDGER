import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import './OrgSuperAdminSidebar.css';  //using styles from OrgSuperAdminSidebar.css because its resuable here

const NAV_ITEMS = [
  {
    group: 'Overview',
    items: [
      {
        to: '/org-admin/dashboard',
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
    group: 'Certificates',
    items: [
      {
        to: '/org/certificates/issue',
        label: 'Issue certificate',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M8 5v6M5 8h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
      {
        to: '/org/certificates',
        label: 'All certificates',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
  {
    group: 'Administration',
    items: [
      {
        to: '/org/audit',
        label: 'Audit log',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.3" />
            <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        ),
      },
    ],
  },
];

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export default function OrgAdminSidebar({ open, onClose, org }) {
  const { auth, logout } = useAuth();
  const user = auth.user
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const initials = getInitials(user?.full_name);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="osa-sidebar-overlay"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`osa-sidebar ${open ? 'osa-sidebar--open' : ''}`}>

        {/* Org identity */}
        <div className="osa-sidebar__org">
          <div className="osa-sidebar__org-avatar" aria-hidden="true">
            {org?.logo_url
              ? <img src={org.logo_url} alt={org?.name} />
              : org?.name?.[0]?.toUpperCase() ?? 'O'
            }
          </div>
          <div className="osa-sidebar__org-info">
            <span className="osa-sidebar__org-name">
              {org?.name ?? 'Your Organisation'}
            </span>
            <span className="osa-sidebar__org-code">{org?.code}</span>
          </div>
          <button
            className="osa-sidebar__close"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* User identity */}
        <div className="osa-sidebar__user">
          <div className="osa-sidebar__user-avatar" aria-hidden="true">
            {initials}
          </div>
          <div className="osa-sidebar__user-info">
            <span className="osa-sidebar__user-name">{user?.full_name}</span>
            <span className="osa-sidebar__user-role">Org Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="osa-sidebar__nav" aria-label="Organisation navigation">
          {NAV_ITEMS.map((group) => (
            <div key={group.group} className="osa-nav-group">
              <span className="osa-nav-group__label">{group.group}</span>
              <ul className="osa-nav-list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={
                        item.to === '/org-super-admin/dashboard' ||
                        item.to === '/org/certificates'
                      }
                      className={({ isActive }) =>
                        `osa-nav-item ${isActive ? 'osa-nav-item--active' : ''}`
                      }
                      onClick={() => { if (window.innerWidth < 768) onClose(); }}
                    >
                      <span className="osa-nav-item__icon">{item.icon}</span>
                      <span className="osa-nav-item__label">{item.label}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="osa-sidebar__bottom">
          <NavLink
            to="/org/change-password"
            className={({ isActive }) =>
              `osa-bottom-item ${isActive ? 'osa-bottom-item--active' : ''}`
            }
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
              <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
            Change password
          </NavLink>

          <button
            className="osa-bottom-item osa-bottom-item--logout"
            onClick={handleLogout}
          >
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