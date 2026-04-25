# PriPay 🛡️💸

**PriPay** is a decentralized, zero-knowledge private payroll platform built on **Solana**. It leverages **MagicBlock's Ephemeral Rollups (TEE)** and the **Loyal Private Transactions SDK** to allow DAOs and businesses to fund a shared payroll vault and distribute salaries with 100% privacy off-chain.

## 🚀 Features

* **Zero-Knowledge Privacy:** Salary amounts, recipient identities, and transfer links are encrypted and processed inside a secure TEE enclave. On-chain observers only see a pooled vault without knowing who received what.
* **Public Vault, Private Claims:** Employers fund a single transparent vault on the public Solana Devnet. Employees claim their individual slices in complete privacy.
* **Instant USDC Settlement:** Behind-the-scenes settlement takes seconds. No intermediaries, no banking delays.
* **Auto-Retry & Resilience:** The `PriPay` architecture robustly handles Ephemeral Rollup (ER) connection drops, safely absorbing timeouts and protecting against SDK re-broadcasts without crashing.

---

## 🛠 Tech Stack

* **Frontend:** Next.js, React, TailwindCSS
* **Blockchain Layer:** Solana Web3.js, Solana Wallet Adapter
* **Privacy SDK:** `@loyal-labs/private-transactions`
* **TEE / Escrow:** MagicBlock Ephemeral Rollups SDK (`@magicblock-labs/ephemeral-rollups-sdk`)

---

## ⚙️ How It Works (The Privacy Model)

To achieve strict privacy on a public blockchain, PayIt utilizes a cryptographic technique called **Delegation**:

1. **Admin Deposits & Delegates:** The Employer deposits a bulk amount of USDC into a Solana smart contract (Deposit PDA). They then "delegate" this account to the MagicBlock TEE (Trusted Execution Environment), granting the off-chain sequencer temporary, exclusive mathematical authority over the funds.
2. **Private Shuffling (TEE):** Inside the TEE, PayIt executes `transferDeposit` instructions. The TEE securely deducts the exact salary from the Employer's delegated account and credits the Employee's delegated account. Because this occurs inside the hardware enclave, the public Solana network sees absolutely nothing. 
3. **Employee Claims:** When the Employee is ready to cash out to their standard Phantom wallet, they run an `undelegateDeposit` function. The TEE releases authority of the Employee's personal Vault PDA back to the Solana Mainnet, allowing them to instantly withdraw their private balance directly into their native USDC token associated account (ATA).

---

## 💻 Local Setup & Development

### 1. Requirements

* Node.js v18+
* A Solana Wallet (e.g., Phantom or Backpack)
* Some **Solana Devnet SOL** (.05 SOL is plenty for gas fees).

### 2. Installation

Clone the repository and install the required dependencies:

```bash
npm install
```

### 3. Environment Variables

In your Next.js environment, the application requires an RPC node to hook into the Solana blockchain.

Create a `.env.local` or `.env` file in the root directory:

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_rpc_key_here
```

### 4. Running the App

Start the development server:

```bash
npm run dev
```

Navigate to `http://localhost:3000` to interact with the PayIt dashboard!

---

## 🏗 Usage Flow

### For Employers 
1. Navigate to the **Employer Portal**.
2. Connect your wallet (Ensure you are on Solana Devnet and have Devnet USDC).
3. Create a new distribution slip (add Employee public keys and USDC amounts).
4. Click **Private Distribution**. The app will lock the total pool overhead and shuffle the underlying ownership entirely within the TEE.
   
### For Employees
1. Navigate to the **Employee Portal**.
2. Connect your wallet.
3. The platform will query the off-chain TEE to scan for your private balances.
4. Click **Claim to Wallet** to initiate the undelegation and finalize the transfer to your standard SPL Token account. (You will need a microscopic amount of SOL gas to pay the network unstaking fee).

---
