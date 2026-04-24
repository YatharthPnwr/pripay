// app/components/FundAndDistribute.tsx
"use client";
import { useState } from "react";
import { Payroll } from "../../lib/types";
import { buildClient, fundAndDistribute } from "../../lib/loyal-client";
import { useWallet } from "@solana/wallet-adapter-react";
import { markSlipDistributed } from "../../lib/payroll-store";
import { CheckCircle2, Loader2, Send, ShieldCheck, Users, Calendar } from "lucide-react";

export function FundAndDistribute({ payroll, onComplete }: { payroll: Payroll, onComplete: () => void }) {
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState("");

  const handleFund = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) return;
    setLoading(true);
    setError(null);
    try {
      setProgress("Building MagicBlock client...");
      const walletLike = {
        publicKey: wallet.publicKey,
        signTransaction: wallet.signTransaction as any,
        signAllTransactions: wallet.signAllTransactions as any,
        signMessage: wallet.signMessage as any,
      };
      const client = await buildClient(walletLike);

      setProgress("Funding & Distributing...");
      console.log("The payroll slip that are being sent ", payroll.slips);
      await fundAndDistribute(client, wallet.publicKey, payroll.slips);

      for (const slip of payroll.slips) {
        markSlipDistributed(payroll.id, slip.id);
      }
      setProgress("Success!");
      onComplete();
    } catch (err: any) {
      console.error(err);
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const isDistributed = payroll.slips.every((s) => s.distributed);
  const totalAmount = payroll.slips.reduce((sum, s) => sum + s.amount, 0) / 1_000_000;
  const date = new Date(payroll.createdAt).toLocaleDateString(undefined, { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="glass glass-hover p-6 rounded-3xl animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-start mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg text-white/90">{payroll.name}</h3>
            {isDistributed && (
              <div className="p-1 bg-green-500/20 rounded-full text-green-400">
                <CheckCircle2 size={14} />
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 text-white/40 text-xs">
            <span className="flex items-center gap-1">
              <Users size={12} />
              {payroll.slips.length} Contributors
            </span>
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              {date}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-white/90">{totalAmount.toLocaleString()}</div>
          <div className="text-[10px] uppercase tracking-widest text-white/30 font-bold">USDC Total</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {payroll.slips.map((slip, i) => (
          <div key={i} className="px-2 py-1 bg-white/5 border border-white/5 rounded-lg text-[10px] text-white/60">
            {slip.label || "Unnamed"}
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {!isDistributed ? (
          <button
            onClick={handleFund}
            disabled={loading || !wallet.publicKey}
            className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all py-3 rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/10"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                {progress || "Processing..."}
              </>
            ) : (
              <>
                <ShieldCheck size={16} />
                Private Distribution
              </>
            )}
          </button>
        ) : (
          <div className="w-full py-3 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center gap-2 text-green-400/80 text-sm font-semibold">
            <CheckCircle2 size={16} />
            Fully Distributed
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-400 text-xs animate-in slide-in-from-top-2">
            <div className="mt-0.5">⚠️</div>
            <p className="break-words leading-relaxed">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
