import './Header.css'
export default function Header({org,user,setSidebarOpen}){
  return(
  <header className="osa-topbar">
          <button
            className="osa-topbar__hamburger"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <span className="ham-line" />
            <span className="ham-line" />
            <span className="ham-line" />
          </button>

          {/* Org name + logo */}
          <div className="osa-topbar__org">
            <div className="osa-topbar__org-avatar" aria-hidden="true">
              {org?.logo_url
                ? <img src={org.logo_url} alt={org?.name} />
                : org?.name?.[0]?.toUpperCase() ?? 'O'
              }
            </div>
            <span className="osa-topbar__org-name">{org?.name ?? '…'}</span>
          </div>

          <div className="osa-topbar__right">
            <span className="osa-role-badge">Org Super Admin</span>
            <div className="osa-topbar__avatar" aria-label={user?.full_name}>
              {user?.full_name
                ?.split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join('') ?? 'U'
              }
            </div>
          </div>
        </header>)

}