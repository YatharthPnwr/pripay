// app/admin/page.tsx
"use client";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import { CreatePayrollForm } from "../components/CreatePayrollForm";
import { FundAndDistribute } from "../components/FundAndDistribute";
import { Payroll } from "../../lib/types";
import { getPayrolls } from "../../lib/payroll-store";
import { LayoutDashboard, Wallet, ArrowLeft, History, PlusCircle } from "lucide-react";
import Link from "next/link";

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
    <main className="min-h-screen pb-20 px-4 pt-8 md:pt-12">
      <div className="max-w-6xl mx-auto space-y-12">
        {/* Navigation Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-6">
            <Link href="/" className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all group">
              <ArrowLeft className="text-white/40 group-hover:text-white group-hover:-translate-x-1 transition-all" size={20} />
            </Link>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard size={18} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-400/80">Employer Portal</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-white drop-shadow-sm">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-indigo-600 hover:!bg-indigo-500 !transition-all !rounded-2xl !h-12 !px-6 !text-sm !font-bold !border-none !shadow-lg !shadow-indigo-600/20" />
          </div>
        </header>

        {!publicKey ? (
          <div className="glass h-[450px] flex flex-col items-center justify-center text-center p-8 rounded-[3rem] animate-in zoom-in-95 duration-700">
            <div className="p-6 bg-white/5 rounded-[2rem] mb-6 relative">
              <Wallet size={48} className="text-white/20" />
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse border-4 border-[#020617]" />
            </div>
            <h2 className="text-2xl font-bold mb-3">Connection Required</h2>
            <p className="text-white/40 max-w-sm mb-8 leading-relaxed">
              Please connect your administrator wallet to manage your team's private payroll distributions.
            </p>
            <WalletMultiButton className="!bg-white !text-black hover:!bg-white/90 !transition-all !rounded-2xl !h-12 !px-8 !text-sm !font-bold !border-none" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-12 gap-12 items-start">
            {/* Left: Create Form */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-2 px-1">
                <PlusCircle size={20} className="text-indigo-400" />
                <h2 className="text-lg font-bold">New Distribution</h2>
              </div>
              <CreatePayrollForm onSaved={loadPayrolls} />
            </div>

            {/* Right: History/List */}
            <div className="lg:col-span-5 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <History size={20} className="text-indigo-400" />
                  <h2 className="text-lg font-bold">Recent Payrolls</h2>
                </div>
                {payrolls.length > 0 && (
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2 py-1 rounded-lg">
                    {payrolls.length} Total
                  </span>
                )}
              </div>

              {payrolls.length === 0 ? (
                <div className="glass p-12 rounded-[2.5rem] flex flex-col items-center justify-center text-center border-dashed">
                  <div className="p-4 bg-white/5 rounded-2xl mb-4">
                    <History size={32} className="text-white/10" />
                  </div>
                  <p className="text-white/30 text-sm font-medium italic">No payroll history found</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                  {[...payrolls].reverse().map((p) => (
                    <FundAndDistribute key={p.id} payroll={p} onComplete={loadPayrolls} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
