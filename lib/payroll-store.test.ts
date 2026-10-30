import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getClaimablePayrolls, getPayrolls, markSlipDistributed, savePayroll } from "./payroll-store";
import { Payroll } from "./types";

const STORAGE_KEY = "pripay_payrolls";
const ADMIN = "admin-wallet";
const OTHER_ADMIN = "other-admin-wallet";
const ALICE = "alice-wallet";
const BOB = "bob-wallet";

const payroll = (overrides: Partial<Payroll> = {}): Payroll => ({
  id: "payroll-1",
  name: "Q2 Payroll",
  adminWallet: ADMIN,
  status: "unfunded",
  createdAt: "2026-01-01T00:00:00.000Z",
  slips: [
    { id: "slip-alice", recipientWallet: ALICE, label: "Alice", amount: 1_000_000, distributed: false },
    { id: "slip-bob", recipientWallet: BOB, label: "Bob", amount: 2_000_000, distributed: false },
  ],
  ...overrides,
});

let storage: Map<string, string>;

beforeEach(() => {
  storage = new Map();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPayrolls / savePayroll", () => {
  it("returns nothing when storage is empty", () => {
    expect(getPayrolls(ADMIN)).toEqual([]);
  });

  it("saves a payroll and returns it for its admin only", () => {
    savePayroll(payroll());
    savePayroll(payroll({ id: "payroll-2", adminWallet: OTHER_ADMIN }));

    expect(getPayrolls(ADMIN).map((p) => p.id)).toEqual(["payroll-1"]);
    expect(getPayrolls(OTHER_ADMIN).map((p) => p.id)).toEqual(["payroll-2"]);
  });

  it("updates an existing payroll instead of adding a duplicate", () => {
    savePayroll(payroll());
    savePayroll(payroll({ name: "Renamed", status: "funded" }));

    const saved = getPayrolls(ADMIN);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ name: "Renamed", status: "funded" });
  });

  it("treats corrupt stored data as empty", () => {
    storage.set(STORAGE_KEY, "{not json");
    expect(getPayrolls(ADMIN)).toEqual([]);
  });
});

describe("markSlipDistributed", () => {
  it("marks only the given slip and persists it", () => {
    savePayroll(payroll());
    markSlipDistributed("payroll-1", "slip-alice");

    const [saved] = getPayrolls(ADMIN);
    expect(saved.slips.map((s) => s.distributed)).toEqual([true, false]);
    expect(JSON.parse(storage.get(STORAGE_KEY)!)[0].slips[0].distributed).toBe(true);
  });

  it("ignores unknown payroll and slip ids", () => {
    savePayroll(payroll());
    const before = storage.get(STORAGE_KEY);

    markSlipDistributed("missing-payroll", "slip-alice");
    markSlipDistributed("payroll-1", "missing-slip");

    expect(storage.get(STORAGE_KEY)).toBe(before);
  });
});

describe("getClaimablePayrolls", () => {
  it("returns payrolls where the employee has a distributed slip", () => {
    savePayroll(payroll());
    expect(getClaimablePayrolls(ALICE)).toEqual([]);

    markSlipDistributed("payroll-1", "slip-alice");
    expect(getClaimablePayrolls(ALICE).map((p) => p.id)).toEqual(["payroll-1"]);
    expect(getClaimablePayrolls(BOB)).toEqual([]);
  });

  it("returns nothing for a wallet with no slips", () => {
    savePayroll(payroll());
    markSlipDistributed("payroll-1", "slip-alice");
    expect(getClaimablePayrolls("stranger-wallet")).toEqual([]);
  });
});

describe("on the server (no window)", () => {
  it("reads as empty and saving is a no-op", () => {
    vi.unstubAllGlobals();
    expect(typeof window).toBe("undefined");
    expect(getPayrolls(ADMIN)).toEqual([]);
    expect(() => savePayroll(payroll())).not.toThrow();
  });
});
