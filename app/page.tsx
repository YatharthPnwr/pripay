import Link from "next/link";

export default function Home() {
  return (
    <div className="landing-hero page-anim">
      <div className="hero-grid-bg" />
      <div className="hero-content">
        <div className="hero-eyebrow">
          <span className="hero-eyebrow-dot" />
          Built on Solana · Powered by Loyal private transactions
        </div>
        <h1 className="hero-title">
          Private <strong>DAO Payroll.</strong>
        </h1>
        <p className="hero-subtitle">
          Fund a salary vault publicly. Pay every contributor privately —
          amounts and recipients stay completely private.
        </p>
        <div className="hero-ctas">
          <Link href="/admin" className="btn btn-accent btn-lg">
            <UsersIcon />
            I&apos;m an Employer
          </Link>
          <Link href="/employee" className="btn btn-surface btn-lg">
            <ZapIcon />
            I&apos;m an Employee
          </Link>
        </div>
        <div className="feature-row">
          <div className="feature-cell">
            <div className="feature-cell-icon">
              <ShieldIcon />
            </div>
            <div className="feature-cell-title">Zero-knowledge Privacy</div>
            <div className="feature-cell-desc">
              Salary amounts are encrypted inside a TEE — on-chain observers see
              nothing.
            </div>
          </div>
          <div className="feature-cell">
            <div className="feature-cell-icon">
              <EyeOffIcon />
            </div>
            <div className="feature-cell-title">Public Vault, Private Claims</div>
            <div className="feature-cell-desc">
              One shared pool funds the DAO. Each member claims their slice in
              private.
            </div>
          </div>
          <div className="feature-cell">
            <div className="feature-cell-icon">
              <ZapIcon />
            </div>
            <div className="feature-cell-title">Instant USDC Settlement</div>
            <div className="feature-cell-desc">
              Claims settle on Solana in seconds. No middlemen, no delays.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2l12 12M6.7 6.8A2 2 0 0 0 9.2 9.2M4 4.3C2.6 5.3 1.5 6.6 1 8c1 3 4 5 7 5 1.2 0 2.4-.3 3.4-.9M7 3.1C7.3 3 7.7 3 8 3c3 0 6 2 7 5-.3.9-.8 1.7-1.4 2.4" />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="9,1 5,9 8,9 7,15 11,7 8,7" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13c0-2.5 2-4 5-4s5 1.5 5 4" />
      <circle cx="12" cy="5" r="2" />
      <path d="M14 12c1 0 2 .7 2 2" />
    </svg>
  );
}
