import { describe, expect, it } from "vitest";
import {
  baseUnitsToUsdc,
  canSavePayroll,
  createPayroll,
  isPayrollDistributed,
  isSlipValid,
  isValidSolanaAddress,
  SlipDraft,
  totalBaseUnits,
  usdcToBaseUnits,
} from "./payroll";

const ALICE = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
const BOB = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const ADMIN = "11111111111111111111111111111111";

const slip = (overrides: Partial<SlipDraft> = {}): SlipDraft => ({
  recipientWallet: ALICE,
  label: "Alice",
  amount: 10,
  ...overrides,
});

describe("usdcToBaseUnits", () => {
  it("converts whole and fractional USDC to 6-decimal base units", () => {
    expect(usdcToBaseUnits(1)).toBe(1_000_000);
    expect(usdcToBaseUnits(0.5)).toBe(500_000);
    expect(usdcToBaseUnits(0.000001)).toBe(1);
  });

  it("rounds away floating point error (2.01 * 1e6 is 2009999.9999999998)", () => {
    expect(usdcToBaseUnits(2.01)).toBe(2_010_000);
    expect(usdcToBaseUnits(4.03)).toBe(4_030_000);
  });

  it("returns an integer BigInt can accept for every cent amount up to 10,000 USDC", () => {
    for (let cents = 1; cents <= 1_000_000; cents++) {
      const units = usdcToBaseUnits(cents / 100);
      if (units !== cents * 10_000) {
        throw new Error(`${cents / 100} USDC converted to ${units}`);
      }
    }
    expect(() => BigInt(usdcToBaseUnits(2.01))).not.toThrow();
  });
});

describe("baseUnitsToUsdc", () => {
  it("converts numbers and bigints back to USDC", () => {
    expect(baseUnitsToUsdc(2_010_000)).toBe(2.01);
    expect(baseUnitsToUsdc(1_500_000n)).toBe(1.5);
    expect(baseUnitsToUsdc(0n)).toBe(0);
  });
});

describe("totalBaseUnits", () => {
  it("sums slip amounts", () => {
    expect(totalBaseUnits([{ amount: 1_000_000 }, { amount: 2_500_000 }])).toBe(3_500_000);
  });

  it("is zero for no slips", () => {
    expect(totalBaseUnits([])).toBe(0);
  });
});

describe("isValidSolanaAddress", () => {
  it("accepts base58 public keys", () => {
    expect(isValidSolanaAddress(ALICE)).toBe(true);
    expect(isValidSolanaAddress(ADMIN)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["too short", "abc"],
    ["not base58 (contains 0, O, I, l)", "0OIl0OIl0OIl0OIl0OIl0OIl0OIl0OIl"],
    ["too long", `${ALICE}${ALICE}`],
    ["an email", "alice@example.com"],
  ])("rejects %s", (_, address) => {
    expect(isValidSolanaAddress(address)).toBe(false);
  });
});

describe("isSlipValid", () => {
  it("accepts a valid wallet with a positive amount", () => {
    expect(isSlipValid(slip())).toBe(true);
    expect(isSlipValid(slip({ amount: 0.01 }))).toBe(true);
  });

  it.each([0, -5, Number.NaN, Number.POSITIVE_INFINITY])("rejects amount %s", (amount) => {
    expect(isSlipValid(slip({ amount }))).toBe(false);
  });

  it("rejects an invalid wallet", () => {
    expect(isSlipValid(slip({ recipientWallet: "not-a-wallet" }))).toBe(false);
  });
});

describe("canSavePayroll", () => {
  it("allows a named payroll with valid, distinct recipients", () => {
    expect(canSavePayroll("Q2 Payroll", [slip(), slip({ recipientWallet: BOB, label: "Bob" })])).toBe(true);
  });

  it("requires a name", () => {
    expect(canSavePayroll("", [slip()])).toBe(false);
    expect(canSavePayroll("   ", [slip()])).toBe(false);
  });

  it("requires at least one slip", () => {
    expect(canSavePayroll("Q2 Payroll", [])).toBe(false);
  });

  it("rejects the same recipient twice", () => {
    expect(canSavePayroll("Q2 Payroll", [slip(), slip({ amount: 5 })])).toBe(false);
  });

  it("rejects the payroll if any slip is invalid", () => {
    expect(canSavePayroll("Q2 Payroll", [slip(), slip({ recipientWallet: BOB, amount: 0 })])).toBe(false);
  });
});

describe("createPayroll", () => {
  const payroll = createPayroll("Q2 Payroll", ADMIN, [slip({ amount: 2.01 }), slip({ recipientWallet: BOB, label: "Bob", amount: 3 })]);

  it("starts unfunded and owned by the admin", () => {
    expect(payroll.name).toBe("Q2 Payroll");
    expect(payroll.adminWallet).toBe(ADMIN);
    expect(payroll.status).toBe("unfunded");
    expect(new Date(payroll.createdAt).toISOString()).toBe(payroll.createdAt);
  });

  it("stores amounts as integer base units", () => {
    expect(payroll.slips.map((s) => s.amount)).toEqual([2_010_000, 3_000_000]);
    expect(totalBaseUnits(payroll.slips)).toBe(5_010_000);
  });

  it("gives every payroll and slip a unique id and marks slips undistributed", () => {
    const ids = [payroll.id, ...payroll.slips.map((s) => s.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(payroll.slips.every((s) => s.distributed === false)).toBe(true);
  });

  it("keeps recipient and label", () => {
    expect(payroll.slips[1]).toMatchObject({ recipientWallet: BOB, label: "Bob" });
  });

  it("falls back to a default name", () => {
    expect(createPayroll("", ADMIN, [slip()]).name).toBe("Unnamed Payroll");
  });
});

describe("isPayrollDistributed", () => {
  it("is true only when every slip is distributed", () => {
    const payroll = createPayroll("Q2", ADMIN, [slip(), slip({ recipientWallet: BOB })]);
    expect(isPayrollDistributed(payroll)).toBe(false);

    payroll.slips[0].distributed = true;
    expect(isPayrollDistributed(payroll)).toBe(false);

    payroll.slips[1].distributed = true;
    expect(isPayrollDistributed(payroll)).toBe(true);
  });
});
