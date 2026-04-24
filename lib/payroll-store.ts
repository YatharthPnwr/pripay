// lib/payroll-store.ts
import { Payroll, PayrollSlip } from "./types";

const STORAGE_KEY = "pripay_payrolls";

function loadAll(): Payroll[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Payroll[];
  } catch {
    return [];
  }
}

function saveAll(payrolls: Payroll[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payrolls));
}

export function getPayrolls(adminWallet: string): Payroll[] {
  return loadAll().filter((p) => p.adminWallet === adminWallet);
}

export function savePayroll(payroll: Payroll): void {
  const payrolls = loadAll();
  const idx = payrolls.findIndex((p) => p.id === payroll.id);
  if (idx >= 0) payrolls[idx] = payroll; else payrolls.push(payroll);
  saveAll(payrolls);
}

export function getClaimablePayrolls(employeeWallet: string): Payroll[] {
  return loadAll().filter(
    (p) => p.slips.some((s) => s.recipientWallet === employeeWallet && s.distributed)
  );
}

export function markSlipDistributed(payrollId: string, slipId: string): void {
  const payrolls = loadAll();
  const pIdx = payrolls.findIndex((p) => p.id === payrollId);
  if (pIdx < 0) return;
  const payroll = payrolls[pIdx];
  const sIdx = payroll.slips.findIndex((s) => s.id === slipId);
  if (sIdx < 0) return;
  payroll.slips[sIdx].distributed = true;
  payrolls[pIdx] = payroll;
  saveAll(payrolls);
}
