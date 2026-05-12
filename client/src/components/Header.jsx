import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth'
import './Header.css';

const ROLE_CONFIG = {
  SUPER_ADMIN: {
    label: 'Super Admin',
    colorClass: 'role--teal',
  },
  ORG_SUPER_ADMIN: {
    label: 'Org Super Admin',
    colorClass: 'role--blue',
  },
  ORG_ADMIN: {
    label: 'Org Admin',
    colorClass: 'role--amber',
  },
};

function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('');
}

export default function Header({ pageTitle, onMenuClick }) {
  const { auth, logout } = useAuth();
  const user = auth?.user
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const role = ROLE_CONFIG[user?.role] ?? { label: user?.role, colorClass: 'role--gray' };
  const initials = user?.role === 'SUPER_ADMIN' ? 'SA' : getInitials(user?.full_name);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Guard: if no user, don't render header
  if (!user) {
    console.warn('Header: No user in auth context');
    return null;
  }

  async function handleLogout() {
    setDropdownOpen(false);
    await logout();
  }

  function handleChangePassword() {
    setDropdownOpen(false);
    navigate('/change-password');
  }

  return (
    <header className="header">
      {/* Left — hamburger + logo */}
      <div className="header__left">
        <button
          className="header__menu-btn"
          onClick={onMenuClick}
          aria-label="Toggle sidebar"
        >
          <span className="hamburger-line" />
          <span className="hamburger-line" />
          <span className="hamburger-line" />
        </button>

        <div className="header__logo">
          <span className="header__logo-mark">⬡</span>
          <span className="header__logo-text">Block-Ledger</span>
        </div>

        {pageTitle && (
          <>
            <span className="header__divider" aria-hidden="true" />
            <h1 className="header__page-title">{pageTitle}</h1>
          </>
        )}
      </div>

      {/* Right — role badge + avatar dropdown */}
      <div className="header__right">
        <span className={`role-badge ${role.colorClass}`}>{role.label}</span>

        <div className="header__user" ref={dropdownRef}>
          <button
            className="header__avatar"
            onClick={() => setDropdownOpen((v) => !v)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            aria-label="User menu"
          >
            {initials}
          </button>

          {dropdownOpen && (
            <div className="header__dropdown" role="menu">
              <div className="dropdown__profile">
                <span className="dropdown__name">{user?.full_name}</span>
                <span className="dropdown__email">{user?.email}</span>
              </div>

              <div className="dropdown__divider" />

              <button
                className="dropdown__item"
                role="menuitem"
                onClick={handleChangePassword}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M5 7V5a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Change password
              </button>

              <button
                className="dropdown__item dropdown__item--danger"
                role="menuitem"
                onClick={handleLogout}
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  <path d="M11 11l3-3-3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M14 8H6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}