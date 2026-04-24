// app/components/ClaimSalary.tsx
"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { buildClient, getPrivateBalance, claimSalary } from "../../lib/loyal-client";

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
    return <p className="text-white/50 text-center text-lg italic">Connect your wallet to view claims...</p>;
  }

  return (
    <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl border border-white/20 text-center shadow-xl">
      <h2 className="text-2xl font-semibold mb-2">Private Payroll Balance</h2>
      {loading ? (
        <p className="text-white/60 mt-4 h-16 flex items-center justify-center">Loading from TEE...</p>
      ) : balance !== null ? (
        <>
          <div className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-400 my-6">
            ${(Number(balance) / 1_000_000).toFixed(2)} USDC
          </div>
          {balance > 0n ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="bg-green-500 hover:bg-green-600 active:scale-95 transition-all text-white font-bold px-8 py-3 rounded-full text-lg shadow-[0_0_20px_rgba(34,197,94,0.4)] disabled:opacity-50 disabled:active:scale-100"
            >
              {claiming ? "Unshielding & Claiming..." : "Claim to Wallet"}
            </button>
          ) : (
            <p className="text-white/40 mt-4">You have no pending funds to claim.</p>
          )}
          {success && <p className="text-green-400 mt-4 font-medium">Successfully claimed to L1 wallet!</p>}
        </>
      ) : null}
      {error && <p className="text-red-400 mt-4 text-sm">{error}</p>}
    </div>
  );
}
