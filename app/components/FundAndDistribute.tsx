"use client";
import { useState } from "react";
import { Payroll } from "../../lib/types";
import { buildClient, fundAndDistribute } from "../../lib/loyal-client";
import { useWallet } from "@solana/wallet-adapter-react";
import { markSlipDistributed } from "../../lib/payroll-store";

export function FundAndDistribute({
  payroll,
  onComplete,
}: {
  payroll: Payroll;
  onComplete: () => void;
}) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const handleFund = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setLoading(true);
    setError(null);
    try {
      setProgress("Building MagicBlock client…");
      const walletLike = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction as any,
        signAllTransactions: wallet.signAllTransactions as any,
        signMessage: wallet.signMessage as any,
      };
      const client = await buildClient(walletLike);
      setProgress("Funding & distributing…");
      await fundAndDistribute(client, wallet.publicKey, payroll.slips);
      for (const slip of payroll.slips) {
        markSlipDistributed(payroll.id, slip.id);
      }
      setProgress("");
      onComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const isDistributed = payroll.slips.every((s) => s.distributed);
  const totalAmount =
    payroll.slips.reduce((sum, s) => sum + s.amount, 0) / 1_000_000;
  const date = new Date(payroll.createdAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="history-item">
      <div className="history-item-row">
        <div>
          <div className="history-name">{payroll.name}</div>
          <div className="history-meta">
            {date} · {payroll.slips.length} contributors
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div className="history-amount">
            {totalAmount.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <span className={`status-pill ${isDistributed ? "status-completed" : "status-pending"}`}>
            {isDistributed ? (
              <>
                <CheckIcon /> Completed
              </>
            ) : (
              <>
                <ClockIcon /> Pending
              </>
            )}
          </span>
        </div>
      </div>

      {!isDistributed && (
        <div className="history-action">
          <button
            className="btn btn-accent btn-sm btn-block"
            onClick={handleFund}
            disabled={loading || !wallet.publicKey}
          >
            {loading ? (
              <>
                <SpinnerIcon /> {progress || "Processing…"}
              </>
            ) : (
              <>
                <ShieldIcon /> Fund &amp; Distribute
              </>
            )}
          </button>
          {error && <div className="error-note">{error}</div>}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width={9} height={9} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,8 6,12 14,4" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width={9} height={9} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6" />
      <polyline points="8,4.5 8,8 10.5,10.5" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4z" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <circle cx="8" cy="8" r="6" strokeOpacity="0.25" />
      <path d="M14 8a6 6 0 0 0-6-6" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
