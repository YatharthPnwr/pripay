"use client";
import { useState } from "react";
import { Payroll, PayrollSlip } from "../../lib/types";
import { savePayroll } from "../../lib/payroll-store";
import { useWallet } from "@solana/wallet-adapter-react";

export function CreatePayrollForm({ onSaved }: { onSaved: () => void }) {
  const { publicKey } = useWallet();
  const [name, setName] = useState("");
  const [slips, setSlips] = useState<Omit<PayrollSlip, "id" | "distributed">[]>([
    { recipientWallet: "", label: "", amount: 0 },
  ]);

  const addSlip = () =>
    setSlips((s) => [...s, { recipientWallet: "", label: "", amount: 0 }]);

  const removeSlip = (index: number) => {
    if (slips.length > 1) {
      const next = [...slips];
      next.splice(index, 1);
      setSlips(next);
    }
  };

  const updateSlip = (index: number, field: string, value: string | number) => {
    const next = [...slips];
    next[index] = { ...next[index], [field]: value };
    setSlips(next);
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

  const total = slips.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
  const canSave =
    !!publicKey && !!name && slips.every((s) => s.recipientWallet && s.amount);

  return (
    <div className="card">
      <div className="card-title">
        <div className="card-title-icon">
          <FileIcon />
        </div>
        New Distribution
      </div>

      <div className="form-section">
        <label className="label">Payroll Campaign Name</label>
        <input
          className="input"
          placeholder="e.g. Core Development Team — Q2 2025"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="form-section">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <label className="label" style={{ margin: 0 }}>
            Contributors &amp; Allocations
          </label>
          <span className="badge">{slips.length} total</span>
        </div>

        <div className="contrib-header">
          <span className="label" style={{ margin: 0 }}>Label</span>
          <span className="label" style={{ margin: 0 }}>Wallet Address</span>
          <span className="label" style={{ margin: 0 }}>USDC</span>
          <span />
        </div>

        {slips.map((slip, i) => (
          <div className="contributor-row" key={i}>
            <input
              className="input"
              placeholder="Alice"
              value={slip.label}
              onChange={(e) => updateSlip(i, "label", e.target.value)}
            />
            <input
              className="input mono"
              placeholder="Solana wallet address"
              value={slip.recipientWallet}
              onChange={(e) => updateSlip(i, "recipientWallet", e.target.value)}
            />
            <input
              className="input mono"
              placeholder="0.00"
              type="number"
              value={slip.amount || ""}
              onChange={(e) =>
                updateSlip(i, "amount", parseFloat(e.target.value) || 0)
              }
              style={{ textAlign: "right" }}
            />
            <button
              className="contrib-remove"
              onClick={() => removeSlip(i)}
              disabled={slips.length === 1}
            >
              <XIcon />
            </button>
          </div>
        ))}

        <button className="add-contrib-btn" onClick={addSlip}>
          <PlusIcon />
          Add Contributor
        </button>
      </div>

      <div className="total-bar">
        <div>
          <div className="total-label">Total Distribution</div>
          <div className="total-amount">
            {total.toLocaleString("en-US", {
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
        <button
          className="btn btn-accent btn-lg"
          onClick={handleSave}
          disabled={!canSave}
          style={{ minWidth: 160 }}
        >
          <LockIcon />
          Initialize Payroll
        </button>
      </div>
    </div>
  );
}

function FileIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9 1H4a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5V6z" />
      <polyline points="9,1 9,6 13.5,6" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="8" y1="2" x2="8" y2="14" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width={13} height={13} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="3" y1="3" x2="13" y2="13" />
      <line x1="13" y1="3" x2="3" y2="13" />
    </svg>
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
