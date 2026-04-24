// app/components/CreatePayrollForm.tsx
"use client";
import { useState } from "react";
import { Payroll, PayrollSlip } from "../../lib/types";
import { savePayroll } from "../../lib/payroll-store";
import { useWallet } from "@solana/wallet-adapter-react";
import { Plus, Trash2, Wallet, Users, FileText, IndianRupee, DollarSign } from "lucide-react";

export function CreatePayrollForm({ onSaved }: { onSaved: () => void }) {
  const { publicKey } = useWallet();
  const [name, setName] = useState("");
  const [slips, setSlips] = useState<Omit<PayrollSlip, "id" | "distributed">[]>([
    { recipientWallet: "", label: "", amount: 0 },
  ]);

  const handleAddSlip = () => {
    setSlips([...slips, { recipientWallet: "", label: "", amount: 0 }]);
  };

  const handleRemoveSlip = (index: number) => {
    if (slips.length > 1) {
      const newSlips = [...slips];
      newSlips.splice(index, 1);
      setSlips(newSlips);
    }
  };

  const handleUpdateSlip = (index: number, field: string, value: string | number) => {
    const newSlips = [...slips];
    newSlips[index] = { ...newSlips[index], [field]: value };
    setSlips(newSlips);
  };

  const handleSave = () => {
    if (!publicKey) return;
    const newPayroll: Payroll = {
      id: crypto.randomUUID(),
      name: name || "Unnamed Payroll",
      adminWallet: publicKey.toBase58(),
      status: "unfunded",
      createdAt: new Date().toISOString(),
      slips: slips.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        amount: Number(s.amount) * 1_000_000, 
        distributed: false,
      })),
    };
    savePayroll(newPayroll);
    onSaved();
    setName("");
    setSlips([{ recipientWallet: "", label: "", amount: 0 }]);
  };

  const totalAmount = slips.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <div className="glass p-8 rounded-3xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400">
          <FileText size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gradient">Create New Payroll</h2>
          <p className="text-white/40 text-sm">Define your team's distribution</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-white/40 mb-2 ml-1">
            Payroll Campaign Name
          </label>
          <div className="relative group">
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-indigo-500/50 focus:bg-indigo-500/5 transition-all"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Core Development Team - Q2"
            />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-end mb-2 ml-1">
            <label className="block text-xs font-semibold uppercase tracking-wider text-white/40">
              Contributors & Allocations
            </label>
            <span className="text-[10px] text-white/30 bg-white/5 px-2 py-0.5 rounded-full uppercase tracking-tighter">
              {slips.length} total
            </span>
          </div>
          
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {slips.map((slip, i) => (
              <div key={i} className="group relative flex flex-col md:flex-row gap-3 p-4 bg-white/[0.03] border border-white/5 rounded-2xl transition-all hover:bg-white/[0.05] hover:border-white/10">
                <div className="flex-1 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                        <Users size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="Label (e.g. Alice)"
                        className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500/30 transition-all"
                        value={slip.label}
                        onChange={(e) => handleUpdateSlip(i, "label", e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                        <Wallet size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="Solana Wallet Address"
                        className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500/30 transition-all font-mono"
                        value={slip.recipientWallet}
                        onChange={(e) => handleUpdateSlip(i, "recipientWallet", e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20">
                      <DollarSign size={14} />
                    </div>
                    <input
                      type="number"
                      placeholder="USDC Amount"
                      className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-500/30 transition-all"
                      value={slip.amount || ""}
                      onChange={(e) => handleUpdateSlip(i, "amount", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>
                
                {slips.length > 1 && (
                  <button
                    onClick={() => handleRemoveSlip(i)}
                    className="self-center p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          <button
            onClick={handleAddSlip}
            className="w-full flex items-center justify-center gap-2 mt-2 py-3 border-2 border-dashed border-white/5 rounded-2xl text-white/30 hover:text-white/60 hover:border-white/20 hover:bg-white/5 transition-all text-sm font-medium"
          >
            <Plus size={16} />
            Add Another Contributor
          </button>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-6">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/30">Total Distribution</span>
          <div className="text-3xl font-bold text-gradient">
            {totalAmount.toLocaleString()} <span className="text-lg font-medium text-indigo-400/80">USDC</span>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={!publicKey || !name || slips.some(s => !s.recipientWallet || !s.amount)}
          className="w-full sm:w-auto px-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:hover:bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Initialize Payroll
        </button>
      </div>
    </div>
  );
}
