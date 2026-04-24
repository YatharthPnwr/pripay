"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { buildClient, getPrivateBalance, claimSalary } from "../../lib/loyal-client";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function ClaimSalary() {
  const wallet = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadBalance() {
      if (!wallet.publicKey || !wallet.signTransaction || !wallet.signMessage) return;
      setLoading(true);
      setError(null);
      try {
        const walletLike = {
          publicKey: wallet.publicKey,
          signTransaction: wallet.signTransaction as any,
          signAllTransactions: wallet.signAllTransactions as any,
          signMessage: wallet.signMessage,
        };
        const client = await buildClient(walletLike);
        const bal = await getPrivateBalance(client, wallet.publicKey);
        setBalance(bal);
      } catch (err: any) {
        setError(err.message || String(err));
      } finally {
        setLoading(false);
      }
    }
    loadBalance();
  }, [wallet.publicKey, wallet.signTransaction, wallet.signMessage, success]);

  const handleClaim = async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signMessage || !balance) return;
    setClaiming(true);
    setError(null);
    try {
      const walletLike = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction as any,
        signAllTransactions: wallet.signAllTransactions as any,
        signMessage: wallet.signMessage,
      };
      const client = await buildClient(walletLike);
      await claimSalary(client, wallet.publicKey, balance);
      setSuccess(true);
      setBalance(0n);
    } catch (err: any) {
      setError(err.message || String(err));
    } finally {
      setClaiming(false);
    }
  };

  if (!wallet.publicKey) {
    return (
      <>
        <div className="balance-card">
          <div className="balance-label">Your Private Payroll Balance</div>
          <div className="balance-amount">—</div>
          <div className="balance-currency">USDC</div>
          <div className="balance-note">
            Connect your wallet to view your private payroll balance.
          </div>
          <WalletMultiButton style={{ width: "100%" }} />
        </div>
        <div className="privacy-note">
          <span style={{ flexShrink: 0, marginTop: 1 }}>
            <LockIcon />
          </span>
          <span>
            Your claim is processed inside a Trusted Execution Environment (TEE).
            The amount you receive is never visible on-chain.
          </span>
        </div>
      </>
    );
  }

  const balanceUSDC = balance !== null ? Number(balance) / 1_000_000 : null;

  return (
    <>
      <div className="balance-card">
        <div className="balance-label">Your Private Payroll Balance</div>

        {loading ? (
          <>
            <div className="balance-amount" style={{ color: "var(--text-3)" }}>
              …
            </div>
            <div className="balance-currency">USDC</div>
            <div className="balance-note">Fetching from TEE…</div>
          </>
        ) : (
          <>
            <div className="balance-amount">
              {balanceUSDC !== null
                ? balanceUSDC.toLocaleString("en-US", { minimumFractionDigits: 2 })
                : "—"}
            </div>
            <div className="balance-currency">USDC</div>
            <div className="balance-note">
              {success
                ? "Successfully claimed. Funds are in your wallet."
                : "This amount is encrypted and only visible to you. No one else can see your salary allocation."}
            </div>

            {!success && balance !== null && balance > 0n ? (
              <button
                className="btn btn-accent btn-lg btn-block"
                onClick={handleClaim}
                disabled={claiming}
              >
                {claiming ? (
                  <>
                    <SpinnerIcon /> Claiming…
                  </>
                ) : (
                  <>
                    <ZapIcon /> Claim{" "}
                    {balanceUSDC?.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    USDC
                  </>
                )}
              </button>
            ) : success ? (
              <button className="btn btn-surface btn-lg btn-block" disabled>
                <CheckIcon /> Claimed
              </button>
            ) : balance !== null && balance === 0n ? (
              <button className="btn btn-surface btn-lg btn-block" disabled>
                No pending funds
              </button>
            ) : null}
          </>
        )}

        {error && <div className="error-note" style={{ marginTop: 16 }}>{error}</div>}
      </div>

      <div className="privacy-note">
        <span style={{ flexShrink: 0, marginTop: 1 }}>
          <LockIcon />
        </span>
        <span>
          Your claim is processed inside a Trusted Execution Environment (TEE).
          The amount you receive is never visible on-chain.
        </span>
      </div>
    </>
  );
}

function LockIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="7" width="10" height="8" rx="1.5" />
      <path d="M5 7V5a3 3 0 0 1 6 0v2" />
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

function CheckIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,8 6,12 14,4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width={14}
      height={14}
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
