import { useNavigate, Link } from 'react-router-dom';
import './HomePage.css';

/* ─── Icons ──────────────────────────────────────────── */

function ShieldIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M11 2L3 6v5c0 4.5 3.3 8.7 8 9.9 4.7-1.2 8-5.4 8-9.9V6L11 2z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M7.5 11l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <path d="M13 2L4 13h7l-2 7 9-11h-7l2-7z" stroke="currentColor" strokeWidth="1.5"
        strokeLinejoin="round"/>
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="9" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M11 2c-2.5 2.5-4 5.6-4 9s1.5 6.5 4 9M11 2c2.5 2.5 4 5.6 4 9s-1.5 6.5-4 9"
        stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 11h18" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="4" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round"/>
      <circle cx="11" cy="15" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function HexIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M16 3L28 9.5v13L16 29 4 22.5v-13L16 3z"
        stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M16 3v26M4 9.5l12 6.5 12-6.5"
        stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

/* ─── Animated counter ───────────────────────────────── */

function StatCard({ value, label, delay }) {
  return (
    <div className="hp-stat" style={{ animationDelay: `${delay}ms` }}>
      <span className="hp-stat__value">{value}</span>
      <span className="hp-stat__label">{label}</span>
    </div>
  );
}

/* ─── Feature card ───────────────────────────────────── */

function FeatureCard({ Icon, title, body, delay }) {
  return (
    <div className="hp-feature" style={{ animationDelay: `${delay}ms` }}>
      <span className="hp-feature__icon"><Icon /></span>
      <h3 className="hp-feature__title">{title}</h3>
      <p className="hp-feature__body">{body}</p>
    </div>
  );
}

/* ─── How it works step ──────────────────────────────── */

function Step({ number, title, body }) {
  return (
    <div className="hp-step">
      <div className="hp-step__num">{number}</div>
      <div className="hp-step__content">
        <h3 className="hp-step__title">{title}</h3>
        <p className="hp-step__body">{body}</p>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */

export default function HomePage() {
  const navigate    = useNavigate();

  return (
    <div className="hp-page">

      {/* ── Navbar ── */}
      <header className="hp-nav">
        <div className="hp-nav__inner">
          <div className="hp-logo">
            <span className="hp-logo__mark">⬡</span>
            <span className="hp-logo__text">Block-Ledger</span>
          </div>
          <nav className="hp-nav__links">
            <a href="#features" className="hp-nav__link">Features</a>
            <a href="#how"      className="hp-nav__link">How it works</a>
            <a href="#verify"   className="hp-nav__link">Verify</a>
          </nav>
          <div className="hp-nav__actions">
            <Link to="/org-login"        className="hp-btn hp-btn--ghost hp-btn--sm">Sign in</Link>
            <Link to="/org-registration" className="hp-btn hp-btn--primary hp-btn--sm">Register institution</Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="hp-hero">

        <div className="hp-hero__bg" aria-hidden="true">
          <img src={'/images/hero-campus.png'} alt="" className="hp-hero__photo" />
          <div className="hp-hero__overlay" />
        </div>

        <div className="hp-hero__inner">
          <div className="hp-hero__eyebrow">
            <span className="hp-badge">
              <span className="hp-badge__dot" />
              Tamper-proof · Instant · Permanent
            </span>
          </div>

          <h1 className="hp-hero__title">
            Academic credentials<br />
            <span className="hp-hero__accent">the world can trust</span>
          </h1>

          <p className="hp-hero__sub">
            Block-Ledger issues and verifies academic certificates on an
            immutable public record. Institutions issue. Students receive.
            Anyone can verify — in seconds.
          </p>

          <div className="hp-hero__ctas">
            <button
              className="hp-btn hp-btn--primary hp-btn--lg"
              onClick={() => navigate('/verify')}
            >
              Verify a certificate <ArrowRightIcon />
            </button>
            <button
              className="hp-btn hp-btn--outline hp-btn--lg"
              onClick={() => navigate('/org-registration')}
            >
              Register your institution
            </button>
          </div>

          {/* stats row */}
          <div className="hp-stats">
            <StatCard value="100%"  label="Tamper-proof"       delay={0}   />
            <div className="hp-stats__divider" />
            <StatCard value="&lt;2s" label="Verification time"  delay={100} />
            <div className="hp-stats__divider" />
            <StatCard value="Free"  label="For verifiers"       delay={200} />
          </div>
        </div>

        {/* hero visual — certificate mockup */}
        <div className="hp-hero__visual" aria-hidden="true">
          <div className="hp-cert">
            <div className="hp-cert__header">
              <span className="hp-cert__logo">⬡</span>
              <div>
                <p className="hp-cert__issuer">University of Yaoundé I</p>
                <p className="hp-cert__sub">Certificate of Achievement</p>
              </div>
              <span className="hp-cert__badge hp-cert__badge--valid">Verified</span>
            </div>
            <div className="hp-cert__body">
              <p className="hp-cert__label">This certifies that</p>
              <p className="hp-cert__name">Keufack Patrick</p>
              <p className="hp-cert__label">has successfully completed</p>
              <p className="hp-cert__program">B.Sc. Software Engineering</p>
              <div className="hp-cert__meta">
                <span>Class of 2023</span>
                <span>GPA 3.85</span>
              </div>
            </div>
            <div className="hp-cert__footer">
              <div className="hp-cert__hash-row">
                <span className="hp-cert__hash-label">ID</span>
                <span className="hp-cert__hash">3f7a1c2d-9b4e-4f1a…</span>
              </div>
              <div className="hp-cert__qr">
                {/* QR pattern made from CSS */}
                <div className="hp-qr" />
              </div>
            </div>
          </div>
          {/* floating check badge */}
          <div className="hp-cert__check">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M4 10l4 4 8-8" stroke="white" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="hp-section hp-section--alt" id="features">
        <div className="hp-section__inner">
          <div className="hp-section__head">
            <p className="hp-section__eyebrow">Why Block-Ledger</p>
            <h2 className="hp-section__title">Built on unbreakable foundations</h2>
            <p className="hp-section__sub">
              Every certificate is cryptographically sealed. No server, no admin,
              no government can alter or erase what has been recorded.
            </p>
          </div>

          <div className="hp-features">
            <FeatureCard
              Icon={ShieldIcon}
              title="Cryptographic integrity"
              body="Each certificate is hashed and anchored to a public blockchain. Any alteration — even a single character — is immediately detectable."
              delay={0}
            />
            <FeatureCard
              Icon={ZapIcon}
              title="Instant verification"
              body="Verify any certificate in under two seconds by ID, PDF upload, or QR code scan. No account, no fee, no friction."
              delay={80}
            />
            <FeatureCard
              Icon={GlobeIcon}
              title="Universally accessible"
              body="The verification portal is public and requires no login. Any employer, institution, or individual worldwide can check authenticity."
              delay={160}
            />
            <FeatureCard
              Icon={LockIcon}
              title="Permanent record"
              body="Once issued, a certificate exists forever on the public record. Institutional closures or data loss cannot erase student achievements."
              delay={240}
            />
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="hp-section" id="how">
        <div className="hp-section__inner hp-section__inner--split">
          <div className="hp-section__head hp-section__head--left">
            <p className="hp-section__eyebrow">Process</p>
            <h2 className="hp-section__title">From issuance to verification</h2>
            <p className="hp-section__sub">
              A simple three-step flow for institutions. A one-step flow for everyone else.
            </p>
            <Link to="/org-registration" className="hp-btn hp-btn--primary hp-btn--md" style={{ marginTop: 24, alignSelf: 'flex-start' }}>
              Get started <ArrowRightIcon />
            </Link>
          </div>

          <div className="hp-steps">
            <Step
              number="01"
              title="Institution registers"
              body="Apply for access. Our team reviews your accreditation documents and approves your account — typically within 48 hours."
            />
            <Step
              number="02"
              title="Certificates are issued"
              body="Authorised staff upload a certificate PDF. We hash the document, record it permanently, and email the student their credentials."
            />
            <Step
              number="03"
              title="Anyone verifies instantly"
              body="Share the certificate ID or scan the QR code. The verification portal confirms authenticity in seconds — no account required."
            />
          </div>
        </div>
      </section>

      {/* ── Verify CTA ── */}
      <section className="hp-section hp-section--alt" id="verify">
        <div className="hp-section__inner">
          <div className="hp-cta-card">
            <div className="hp-cta-card__left">
              <p className="hp-section__eyebrow">Verify now</p>
              <h2 className="hp-cta-card__title">Have a certificate to check?</h2>
              <p className="hp-cta-card__sub">
                Enter the certificate ID, upload the PDF, or scan the QR code.
                Results are instant and require no account.
              </p>
              <ul className="hp-cta-card__list">
                {['No account required', 'Works on any device', 'Results in under 2 seconds'].map(item => (
                  <li key={item} className="hp-cta-card__item">
                    <span className="hp-cta-card__check"><CheckIcon /></span>
                    {item}
                  </li>
                ))}
              </ul>
              <button
                className="hp-btn hp-btn--primary hp-btn--lg"
                onClick={() => navigate('/verify')}
              >
                Go to verification <ArrowRightIcon />
              </button>
            </div>
            <div className="hp-cta-card__right" aria-hidden="true">
              <div className="hp-verify-preview">
                <div className="hp-verify-preview__bar">
                  <div className="hp-verify-preview__dot" />
                  <div className="hp-verify-preview__dot" />
                  <div className="hp-verify-preview__dot" />
                </div>
                <div className="hp-verify-preview__result hp-verify-preview__result--valid">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="1.5"/>
                    <path d="M9 16l5 5 9-9" stroke="currentColor" strokeWidth="2"
                      strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <p className="hp-verify-preview__status">Certificate verified</p>
                    <p className="hp-verify-preview__name">Keufack — B.Sc. Software Engineering</p>
                  </div>
                </div>
                <div className="hp-verify-preview__rows">
                  <div className="hp-verify-preview__row">
                    <span>Issued by</span><span>University of Yaoundé I</span>
                  </div>
                  <div className="hp-verify-preview__row">
                    <span>Issued on</span><span>12 Jun 2023</span>
                  </div>
                  <div className="hp-verify-preview__row">
                    <span>Status</span>
                    <span className="hp-verify-preview__badge">Valid</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer">
        <div className="hp-footer__inner">
          <div className="hp-logo">
            <span className="hp-logo__mark">⬡</span>
            <span className="hp-logo__text">Block-Ledger</span>
          </div>
          <div className="hp-footer__links">
            <Link to="/verify"           className="hp-footer__link">Verify certificate</Link>
            <Link to="/org-registration" className="hp-footer__link">Register institution</Link>
            <Link to="/org-login"        className="hp-footer__link">Institution login</Link>
          </div>
          <p className="hp-footer__copy">
            © {new Date().getFullYear()} Block-Ledger. All rights reserved.
          </p>
        </div>
      </footer>

    </div>
  );
}