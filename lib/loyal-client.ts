// lib/loyal-client.ts
import { LoyalPrivateTransactionsClient, findDepositPda } from "@loyal-labs/private-transactions";
import { Connection, PublicKey, SendTransactionError } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import type { WalletLike } from "@loyal-labs/private-transactions";
import { getAuthToken } from "@magicblock-labs/ephemeral-rollups-sdk";
import { USDC_MINT_MAINNET, BASE_RPC, BASE_WS, EPHEMERAL_RPC, EPHEMERAL_WS, ER_VALIDATOR, MAGIC_PROGRAM_ID, MAGIC_CONTEXT_ID } from "./constants";
import { PayrollSlip } from "./types";

const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

async function getDepositState(
  connection: Connection,
  user: PublicKey,
  tokenMint: PublicKey
): Promise<{ exists: boolean; delegated: boolean }> {
  const [pda] = findDepositPda(user, tokenMint);
  const info = await connection.getAccountInfo(pda);
  if (!info) return { exists: false, delegated: false };
  return { exists: true, delegated: info.owner.equals(DELEGATION_PROGRAM_ID) };
}

type WalletWithSign = WalletLike & { signMessage?: (msg: Uint8Array) => Promise<Uint8Array> };

export async function buildClient(wallet: WalletWithSign): Promise<LoyalPrivateTransactionsClient> {
  if (typeof wallet.signMessage !== "function") {
    throw new Error("Your wallet must support message signing (signMessage) to authenticate with the private TEE.");
  }

  const authToken = await getAuthToken(
    EPHEMERAL_RPC,
    wallet.publicKey,
    (msg: Uint8Array) => wallet.signMessage!(msg)
  );

  const client = await LoyalPrivateTransactionsClient.fromConfig({
    signer: wallet,
    baseRpcEndpoint: BASE_RPC,
    baseWsEndpoint: BASE_WS,
    ephemeralRpcEndpoint: EPHEMERAL_RPC,
    ephemeralWsEndpoint: EPHEMERAL_WS,
    authToken,
  });
  return client;
}

async function runWithSuppressAlreadyProcessed<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T | void> {
  try {
    return await fn();
  } catch (err: any) {
    const isTimeout = err?.message?.includes("was not confirmed in");
    const isAlreadyProcessed = err?.message?.includes("already been processed");

    if (isTimeout || isAlreadyProcessed) {
      console.log(`[fund] ${label} considered successful (timed out or already processed)`);
      return;
    }

    if (err instanceof SendTransactionError) {
      const erConn = new Connection(EPHEMERAL_RPC);
      const logs = await err.getLogs(erConn).catch(() => null);
      const logsStr = logs?.join(" | ") ?? "";
      
      if (logsStr.includes("already been processed") || err.message.includes("already been processed")) {
        console.log(`[fund] ${label} already processed (confirmed despite timeout, continuing)`);
        return;
      }

      console.error(`[fund] SendTransactionError logs for ${label}:`, logs);
      throw new Error(`${label} failed: ${logsStr || err.message}`);
    }
    
    throw err;
  }
}

/** Admin flow: fund the vault and privately distribute to each slip */
export async function fundAndDistribute(
  client: LoyalPrivateTransactionsClient,
  adminPublicKey: PublicKey,
  slips: PayrollSlip[]
): Promise<void> {
  const tokenMint = new PublicKey(USDC_MINT_MAINNET);
  const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, adminPublicKey);
  const validator = new PublicKey(ER_VALIDATOR);
  const magicProgram = new PublicKey(MAGIC_PROGRAM_ID);
  const magicContext = new PublicKey(MAGIC_CONTEXT_ID);
  const connection = new Connection(BASE_RPC);
  const total = BigInt(slips.reduce((sum, s) => sum + s.amount, 0));

  //0. Undelegate admin deposit only if currently delegated on-chain
  const adminState = await getDepositState(connection, adminPublicKey, tokenMint);
  console.log("[fund] admin on-chain state:", adminState);

  if (adminState.delegated) {
    console.log("[fund] undelegating admin deposit");
    await runWithSuppressAlreadyProcessed("undelegating admin deposit", () => client.undelegateDeposit({
      user: adminPublicKey,
      tokenMint,
      payer: adminPublicKey,
      magicProgram,
      magicContext,
    }));
  }

  //1. Initialize admin deposit PDA only if it doesn't exist yet
  if (!adminState.exists) {
    console.log("[fund] initializing admin deposit PDA");
    await runWithSuppressAlreadyProcessed("initializing admin deposit PDA", () => client.initializeDeposit({
      user: adminPublicKey,
      tokenMint,
      payer: adminPublicKey,
    }));
  }

  //2. Top up the admin deposit — only transfer what is still missing
  const baseDeposit = await client.getBaseDeposit(adminPublicKey, tokenMint);
  const currentBalance = baseDeposit?.amount ?? 0n;
  console.log("[fund] base deposit balance:", currentBalance.toString(), "/ needed:", total.toString());

  if (currentBalance < total) {
    const needed = Number(total - currentBalance);
    console.log("[fund] calling modifyBalance, topping up by:", needed);
    await runWithSuppressAlreadyProcessed("modifyBalance admin deposit", () => client.modifyBalance({
      user: adminPublicKey,
      tokenMint,
      increase: true,
      amount: needed,
      payer: adminPublicKey,
      userTokenAccount,
    }));
  } else {
    console.log("[fund] admin deposit already has sufficient balance, skipping modifyBalance");
  }

  //3. Create permission (SDK no-ops if it already exists)
  console.log("[fund] creating permission");
  await runWithSuppressAlreadyProcessed("creating permission", () => client.createPermission({
    user: adminPublicKey,
    tokenMint,
    payer: adminPublicKey,
  }));

  //4. Delegate admin deposit to ER
  console.log("[fund] delegating admin deposit");
  await runWithSuppressAlreadyProcessed("delegating admin deposit", () => client.delegateDeposit({
    user: adminPublicKey,
    tokenMint,
    payer: adminPublicKey,
    validator,
  }));

  //5. Private transfers for each employee
  const adminBefore = await client.getEphemeralDeposit(adminPublicKey, tokenMint);
  console.log("[DEBUG] admin ER balance BEFORE transfers:", adminBefore?.amount?.toString() ?? "null");

  for (const slip of slips) {
    const recipient = new PublicKey(slip.recipientWallet);
    console.log("[fund] processing slip:", slip.label, "→", recipient.toString(), "amount:", slip.amount);
    console.log("[DEBUG] recipient:", recipient.toString());
    console.log("[DEBUG] admin:    ", adminPublicKey.toString());
    console.log("[DEBUG] same?", recipient.toString() === adminPublicKey.toString());

    const recipState = await getDepositState(connection, recipient, tokenMint);

    if (!recipState.exists) {
      console.log("[fund] initializing recipient deposit PDA");
      await runWithSuppressAlreadyProcessed("initializing recipient deposit PDA", () => client.initializeDeposit({
        user: recipient,
        tokenMint,
        payer: adminPublicKey,
      }));
    }

    if (!recipState.delegated) {
      console.log("[fund] delegating recipient deposit");
      await runWithSuppressAlreadyProcessed("delegating recipient deposit", () => client.delegateDeposit({
        user: recipient,
        tokenMint,
        payer: adminPublicKey,
        validator,
      }));
    }

    console.log("[fund] transferring", slip.amount, "to", recipient.toString());
    await runWithSuppressAlreadyProcessed(`transfer to ${slip.label}`, () => client.transferDeposit({
      user: adminPublicKey,
      destinationUser: recipient,
      tokenMint,
      amount: slip.amount,
      payer: adminPublicKey,
      rpcOptions: { skipPreflight: true, preflightCommitment: "processed" },
    }));
    console.log("[fund] transfer action finished for:", slip.label);
  }

  const adminAfter = await client.getEphemeralDeposit(adminPublicKey, tokenMint);
  console.log("[DEBUG] admin ER balance AFTER transfers:", adminAfter?.amount?.toString() ?? "null");
  console.log("[fund] all transfers complete");
}

/** Employee flow: read private balance from the TEE */
export async function getPrivateBalance(
  client: LoyalPrivateTransactionsClient,
  employeePublicKey: PublicKey
): Promise<bigint> {
  const tokenMint = new PublicKey(USDC_MINT_MAINNET);
  const deposit = await client.getEphemeralDeposit(employeePublicKey, tokenMint);
  console.log("[DEBUG] getEphemeralDeposit for", employeePublicKey.toString(), "→", deposit);
  return deposit?.amount ?? 0n;
}

/** Employee flow: claim (undelegate + withdraw) */
export async function claimSalary(
  client: LoyalPrivateTransactionsClient,
  employeePublicKey: PublicKey,
  amount: bigint
): Promise<void> {
  const tokenMint = new PublicKey(USDC_MINT_MAINNET);
  const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, employeePublicKey);
  const magicProgram = new PublicKey(MAGIC_PROGRAM_ID);
  const magicContext = new PublicKey(MAGIC_CONTEXT_ID);

  const connection = new Connection(BASE_RPC);
  const empState = await getDepositState(connection, employeePublicKey, tokenMint);
  if (empState.delegated) {
    await runWithSuppressAlreadyProcessed("undelegating employee deposit", () => client.undelegateDeposit({
      user: employeePublicKey,
      tokenMint,
      payer: employeePublicKey,
      magicProgram,
      magicContext,
    }));
  }

  await runWithSuppressAlreadyProcessed("withdrawing from employee deposit", () => client.modifyBalance({
    user: employeePublicKey,
    tokenMint,
    increase: false,
    amount: Number(amount),
    payer: employeePublicKey,
    userTokenAccount,
  }));
}
