"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CreatePayrollForm } from "../components/CreatePayrollForm";
import { FundAndDistribute } from "../components/FundAndDistribute";
import { Payroll } from "../../lib/types";
import { getPayrolls } from "../../lib/payroll-store";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function AdminDashboard() {
  const { publicKey } = useWallet();
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);

  const loadPayrolls = () => {
    if (publicKey) setPayrolls(getPayrolls(publicKey.toBase58()));
  };

  useEffect(() => {
    loadPayrolls();
  }, [publicKey]);

  return (
    <main className="page-wrap page-anim">
      <div>
        <Link href="/" className="page-back">
          <ArrowLeftIcon />
          Employer Portal
        </Link>
        <h1 className="page-title">Create a payroll</h1>
        <p className="page-subtitle">
          Create and manage private payroll distributions for your DAO.
        </p>
      </div>

      {!publicKey ? (
        <div className="connect-required">
          <div className="connect-icon">
            <WalletIcon />
          </div>
          <div className="connect-title">Connection Required</div>
          <p className="connect-desc">
            Connect your administrator wallet to manage your team&apos;s private
            payroll distributions.
          </p>
          <WalletMultiButton />
        </div>
      ) : (
        <div className="admin-grid">
          <CreatePayrollForm onSaved={loadPayrolls} />

          <div className="card">
            <div className="card-title">
              <div className="card-title-icon">
                <ClockIcon />
              </div>
              Recent Payrolls
            </div>

            {payrolls.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <ClockIcon />
                </div>
                <div className="empty-title">No payrolls yet</div>
                <p className="empty-desc">
                  Create your first distribution to see it here.
                </p>
              </div>
            ) : (
              <div
                style={{
                  maxHeight: 600,
                  overflowY: "auto",
                  paddingRight: 4,
                }}
              >
                {[...payrolls].reverse().map((p) => (
                  <FundAndDistribute
                    key={p.id}
                    payroll={p}
                    onComplete={loadPayrolls}
                  />
                ))}
              </div>
            )}

            {payrolls.length > 0 && (
              <div
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <div className="total-label" style={{ marginBottom: 6 }}>
                  All-time distributed
                </div>
                <div className="total-amount">
                  {(
                    payrolls
                      .filter((p) => p.slips.every((s) => s.distributed))
                      .reduce(
                        (sum, p) =>
                          sum +
                          p.slips.reduce((s, slip) => s + slip.amount, 0) /
                            1_000_000,
                        0
                      )
                  ).toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span
                    style={{
                      fontSize: 13,
                      color: "var(--text-3)",
                      marginLeft: 6,
                      fontWeight: 400,
                    }}
                  >
                    USDC
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="10,3 4,8 10,13" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 2H8a2 2 0 0 0-2 2v3h12V4a2 2 0 0 0-2-2z" />
      <circle cx="17" cy="14" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <polyline points="8,4.5 8,8 10.5,10.5" />
    </svg>
  );
}
