import './FooterUnrestricted.css'
import { Link } from 'react-router-dom'
export default function FooterUnrestricted(){
  return(
    <footer className="hp-footer">
        <div className="hp-footer__inner">
          <div className="hp-logo">
            <span className="hp-logo__mark">⬡</span>
            <span className="hp-logo__text">Grad-Ledger</span>
          </div>
          <div className="hp-footer__links">
            <Link to="/verify"           className="hp-footer__link">Verify certificate</Link>
            <Link to="/org-registration" className="hp-footer__link">Register institution</Link>
            <Link to="/org-login"        className="hp-footer__link">Institution login</Link>
          </div>
          <p className="hp-footer__copy">
            © {new Date().getFullYear()} Grad-Ledger. All rights reserved.
          </p>
        </div>
      </footer>
  )
}