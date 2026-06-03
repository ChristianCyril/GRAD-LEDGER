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
           <div className="hp-logo">
            <span className="hp-logo__mark">⬡</span>   {/*styles for these block of components found in footer unrestricted*/}
            <span className="hp-logo__text">Grad-Ledger</span>
          </div>
          </div>
        </header>)

}