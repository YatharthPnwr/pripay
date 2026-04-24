export interface PayrollSlip {
  id: string
  recipientWallet: string  // base-58 public key
  label: string            // "Alice – Designer" (local only, never on-chain)
  amount: number           // lamports (USDC 6-decimal)
  distributed: boolean     // has transferDeposit been called for this slip?
}

export interface Payroll {
  id: string
  name: string
  adminWallet: string
  slips: PayrollSlip[]
  // possible states: unfunded → funded → delegated → distributed
  status: "unfunded" | "funded" | "delegated" | "distributed"
  createdAt: string
}
