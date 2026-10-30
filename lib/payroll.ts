// lib/payroll.ts
import { PublicKey } from "@solana/web3.js";
import { Payroll, PayrollSlip } from "./types";

const BASE_UNITS_PER_USDC = 1_000_000; // USDC has 6 decimals

/** A slip as typed into the form: `amount` is in whole USDC, not base units. */
export type SlipDraft = Omit<PayrollSlip, "id" | "distributed">;

/**
 * USDC (e.g. 2.01) → integer base units (2_010_000).
 * Rounds because `2.01 * 1_000_000` is 2009999.9999999998 in floating point,
 * and a fractional amount makes `BigInt()` throw when the payroll is funded.
 */
export function usdcToBaseUnits(usdc: number): number {
  return Math.round(usdc * BASE_UNITS_PER_USDC);
}

export function baseUnitsToUsdc(units: number | bigint): number {
  return Number(units) / BASE_UNITS_PER_USDC;
}

export function totalBaseUnits(slips: Pick<PayrollSlip, "amount">[]): number {
  return slips.reduce((sum, s) => sum + s.amount, 0);
}

export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

export function isSlipValid(slip: SlipDraft): boolean {
  return isValidSolanaAddress(slip.recipientWallet) && Number.isFinite(slip.amount) && slip.amount > 0;
}

/** Each recipient may appear once: funding initializes and delegates one deposit per recipient. */
export function canSavePayroll(name: string, slips: SlipDraft[]): boolean {
  const recipients = new Set(slips.map((s) => s.recipientWallet));
  return (
    name.trim() !== "" &&
    slips.length > 0 &&
    recipients.size === slips.length &&
    slips.every(isSlipValid)
  );
}

export function createPayroll(name: string, adminWallet: string, slips: SlipDraft[]): Payroll {
  return {
    id: crypto.randomUUID(),
    name: name || "Unnamed Payroll",
    adminWallet,
    status: "unfunded",
    createdAt: new Date().toISOString(),
    slips: slips.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      amount: usdcToBaseUnits(Number(s.amount)),
      distributed: false,
    })),
  };
}

export function isPayrollDistributed(payroll: Payroll): boolean {
  return payroll.slips.every((s) => s.distributed);
}
