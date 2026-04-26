// lib/loyal-client.ts
import {
  LoyalPrivateTransactionsClient,
  findDepositPda,
  findVaultPda,
  findPermissionPda,
  findDelegationRecordPda,
  findDelegationMetadataPda,
  findBufferPda,
  DELEGATION_PROGRAM_ID,
  PERMISSION_PROGRAM_ID,
  PROGRAM_ID,
  waitForAccountOwnerChange,
} from "@loyal-labs/private-transactions";
import {
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import type { WalletLike } from "@loyal-labs/private-transactions";
import { getAuthToken } from "@magicblock-labs/ephemeral-rollups-sdk";
import { BN } from "@coral-xyz/anchor";
import { SYSVAR_INSTRUCTIONS_PUBKEY } from "@solana/web3.js";
import {
  USDC_MINT_DEVNET,
  BASE_RPC,
  BASE_WS,
  EPHEMERAL_RPC,
  EPHEMERAL_WS,
  ER_VALIDATOR,
  MAGIC_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
} from "./constants";
import { PayrollSlip } from "./types";

const KLEND_PROGRAM_ID = new PublicKey("KLend2g3cP87fffoy8q1mQqGKjrxjC8boSyAYavgmjD");

interface KaminoAccounts {
  lendingMarket: PublicKey;
  lendingMarketAuthority: PublicKey;
  reserve: PublicKey;
  reserveLiquiditySupply: PublicKey;
  reserveCollateralMint: PublicKey;
  instructionSysvarAccount: PublicKey;
  klendProgram: PublicKey;
}

function getKaminoAccounts(tokenMint: PublicKey): KaminoAccounts | null {
  const DEVNET_MINT  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
  const MAINNET_MINT = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
  const mint = tokenMint.toBase58();

  if (mint === DEVNET_MINT) {
    const lendingMarket = new PublicKey("27MKCQo5qP7ijrwWSMKX2Jeb3PhK2NZmHQ9befWVRS4J");
    return {
      lendingMarket,
      lendingMarketAuthority: PublicKey.findProgramAddressSync([Buffer.from("lma"), lendingMarket.toBuffer()], KLEND_PROGRAM_ID)[0],
      reserve: new PublicKey("9uKMtFU9UJ9DfbwzCReGENb31appi79KTEeDGdCnvMjy"),
      reserveLiquiditySupply: new PublicKey("Bh45cPkpfRvz9hAs23ye5TowsGbhbh4BXT4AGww8JfES"),
      reserveCollateralMint: new PublicKey("8GoBXfEq3aTiWTxEP2tAaygJMx3LhG764iN5e6gqaLA"),
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
      klendProgram: KLEND_PROGRAM_ID,
    };
  }

  if (mint === MAINNET_MINT) {
    const lendingMarket = new PublicKey("CqAoLuqWtavaVE8deBjMKe8ZfSt9ghR6Vb8nfsyabyHA");
    return {
      lendingMarket,
      lendingMarketAuthority: PublicKey.findProgramAddressSync([Buffer.from("lma"), lendingMarket.toBuffer()], KLEND_PROGRAM_ID)[0],
      reserve: new PublicKey("9GJ9GBRwCp4pHmWrQ43L5xpc9Vykg7jnfwcFGN8FoHYu"),
      reserveLiquiditySupply: new PublicKey("H6JUwz8c61eQnYUx8avGXydKztKPyGvgWAUjmZUPS3BC"),
      reserveCollateralMint: new PublicKey("DKaVQFXD6Qz4USTkRWyPun3oU6r1RfYsWJ8YqLpnSnN5"),
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
      klendProgram: KLEND_PROGRAM_ID,
    };
  }

  return null;
}

async function getDepositState(
  connection: Connection,
  user: PublicKey,
  tokenMint: PublicKey
): Promise<{ exists: boolean; delegated: boolean }> {
  const [pda] = findDepositPda(user, tokenMint);
  const info = await connection.getAccountInfo(pda, "confirmed");
  if (!info) return { exists: false, delegated: false };
  return { exists: true, delegated: info.owner.equals(DELEGATION_PROGRAM_ID) };
}

type WalletWithSign = WalletLike & { signMessage?: (msg: Uint8Array) => Promise<Uint8Array> };

const authTokenCache = new Map<string, { token: string; expiresAt: number }>();

export async function buildClient(wallet: WalletWithSign): Promise<LoyalPrivateTransactionsClient> {
  if (typeof wallet.signMessage !== "function") {
    throw new Error("Your wallet must support message signing (signMessage) to authenticate with the private TEE.");
  }

  const walletKey = wallet.publicKey.toBase58();
  const cached = authTokenCache.get(walletKey);
  const authToken =
    cached && cached.expiresAt > Date.now() + 60_000
      ? cached
      : await getAuthToken(EPHEMERAL_RPC, wallet.publicKey, (msg: Uint8Array) => wallet.signMessage!(msg)).then(
          (t) => { authTokenCache.set(walletKey, t); return t; }
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

/** Admin flow: fund the vault and privately distribute to each slip — single wallet popup */
export async function fundAndDistribute(
  client: LoyalPrivateTransactionsClient,
  adminPublicKey: PublicKey,
  slips: PayrollSlip[]
): Promise<void> {
  const tokenMint = new PublicKey(USDC_MINT_DEVNET);
  const adminTokenAccount = getAssociatedTokenAddressSync(tokenMint, adminPublicKey);
  const validator = new PublicKey(ER_VALIDATOR);
  const magicProgram = new PublicKey(MAGIC_PROGRAM_ID);
  const magicContext = new PublicKey(MAGIC_CONTEXT_ID);
  const connection = new Connection(BASE_RPC, { wsEndpoint: BASE_WS });
  const total = BigInt(slips.reduce((sum, s) => sum + s.amount, 0));
  const recipients = slips.map(s => new PublicKey(s.recipientWallet));
  const [adminDepositPda] = findDepositPda(adminPublicKey, tokenMint);

  // 1. Pre-flight: check all states in parallel
  const [adminState, ...recipientStates] = await Promise.all([
    getDepositState(connection, adminPublicKey, tokenMint),
    ...recipients.map(r => getDepositState(connection, r, tokenMint)),
  ]);
  console.log("[fund] admin state:", adminState);

  // 2. Undelegate admin if currently delegated (must complete before re-funding)
  if (adminState.delegated) {
    console.log("[fund] undelegating admin deposit");
    await runWithSuppressAlreadyProcessed("undelegating admin deposit", () =>
      client.undelegateDeposit({ user: adminPublicKey, tokenMint, payer: adminPublicKey, magicProgram, magicContext })
    );
  }

  // 3. Check balance and permission after potential undelegate
  const [baseDeposit, adminPermissionInfo] = await Promise.all([
    client.getBaseDeposit(adminPublicKey, tokenMint),
    connection.getAccountInfo(findPermissionPda(adminDepositPda)[0]),
  ]);
  const currentBalance = baseDeposit?.amount ?? 0n;
  const topUpAmount = currentBalance < total ? Number(total - currentBalance) : 0;
  const permissionExists = !!adminPermissionInfo;
  console.log("[fund] balance:", currentBalance.toString(), "/ needed:", total.toString(), "/ topUp:", topUpAmount);

  // 4. Build all base chain instructions (batched into one transaction)
  const baseIxs: TransactionInstruction[] = [];

  if (!adminState.exists) {
    baseIxs.push(
      await client.baseProgram.methods
        .initializeDeposit()
        .accountsPartial({
          payer: adminPublicKey,
          user: adminPublicKey,
          deposit: adminDepositPda,
          tokenMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
  }

  for (let i = 0; i < recipients.length; i++) {
    if (!recipientStates[i].exists) {
      const [recipDepositPda] = findDepositPda(recipients[i], tokenMint);
      baseIxs.push(
        await client.baseProgram.methods
          .initializeDeposit()
          .accountsPartial({
            payer: adminPublicKey,
            user: recipients[i],
            deposit: recipDepositPda,
            tokenMint,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction()
      );
    }
  }

  if (topUpAmount > 0) {
    const [vaultPda] = findVaultPda(tokenMint);
    const vaultTokenAccount = getAssociatedTokenAddressSync(
      tokenMint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const kaminoAccounts = getKaminoAccounts(tokenMint);
    const vaultCollateralTokenAccount = kaminoAccounts
      ? getAssociatedTokenAddressSync(kaminoAccounts.reserveCollateralMint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
      : null;
    let modifyBalanceBuilder = client.baseProgram.methods
      .modifyBalance({ amount: new BN(topUpAmount), increase: true })
      .accountsPartial({
        payer: adminPublicKey,
        user: adminPublicKey,
        vault: vaultPda,
        deposit: adminDepositPda,
        userTokenAccount: adminTokenAccount,
        vaultTokenAccount,
        tokenMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      });
    if (kaminoAccounts && vaultCollateralTokenAccount) {
      modifyBalanceBuilder = modifyBalanceBuilder.remainingAccounts([
        { pubkey: kaminoAccounts.lendingMarket, isSigner: false, isWritable: false },
        { pubkey: kaminoAccounts.lendingMarketAuthority, isSigner: false, isWritable: false },
        { pubkey: kaminoAccounts.reserve, isSigner: false, isWritable: true },
        { pubkey: kaminoAccounts.reserveLiquiditySupply, isSigner: false, isWritable: true },
        { pubkey: kaminoAccounts.reserveCollateralMint, isSigner: false, isWritable: true },
        { pubkey: vaultCollateralTokenAccount, isSigner: false, isWritable: true },
        { pubkey: kaminoAccounts.instructionSysvarAccount, isSigner: false, isWritable: false },
        { pubkey: kaminoAccounts.klendProgram, isSigner: false, isWritable: false },
      ]);
    }
    baseIxs.push(await modifyBalanceBuilder.instruction());
  }

  if (!permissionExists) {
    const [permissionPda] = findPermissionPda(adminDepositPda);
    baseIxs.push(
      await client.baseProgram.methods
        .createPermission()
        .accountsPartial({
          payer: adminPublicKey,
          user: adminPublicKey,
          deposit: adminDepositPda,
          permission: permissionPda,
          permissionProgram: PERMISSION_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
  }

  // delegate admin deposit
  {
    const [bufferPda] = findBufferPda(adminDepositPda);
    const [delegationRecordPda] = findDelegationRecordPda(adminDepositPda);
    const [delegationMetadataPda] = findDelegationMetadataPda(adminDepositPda);
    baseIxs.push(
      await client.baseProgram.methods
        .delegate(adminPublicKey, tokenMint)
        .accountsPartial({
          payer: adminPublicKey,
          validator,
          bufferDeposit: bufferPda,
          delegationRecordDeposit: delegationRecordPda,
          delegationMetadataDeposit: delegationMetadataPda,
          deposit: adminDepositPda,
          ownerProgram: PROGRAM_ID,
          delegationProgram: DELEGATION_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .instruction()
    );
  }

  // delegate each recipient that needs it
  for (let i = 0; i < recipients.length; i++) {
    if (!recipientStates[i].delegated) {
      const [recipDepositPda] = findDepositPda(recipients[i], tokenMint);
      const [bufferPda] = findBufferPda(recipDepositPda);
      const [delegationRecordPda] = findDelegationRecordPda(recipDepositPda);
      const [delegationMetadataPda] = findDelegationMetadataPda(recipDepositPda);
      baseIxs.push(
        await client.baseProgram.methods
          .delegate(recipients[i], tokenMint)
          .accountsPartial({
            payer: adminPublicKey,
            validator,
            bufferDeposit: bufferPda,
            delegationRecordDeposit: delegationRecordPda,
            delegationMetadataDeposit: delegationMetadataPda,
            deposit: recipDepositPda,
            ownerProgram: PROGRAM_ID,
            delegationProgram: DELEGATION_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction()
      );
    }
  }

  // 5. Build ER transfer instructions (all in one transaction)
  // Use the client's existing ephemeral connection which has the auth token configured
  const erConn: Connection = client.ephemeralProgram.provider.connection;
  const erIxs: TransactionInstruction[] = [];
  for (let i = 0; i < recipients.length; i++) {
    const [destDepositPda] = findDepositPda(recipients[i], tokenMint);
    erIxs.push(
      await client.ephemeralProgram.methods
        .transferDeposit(new BN(slips[i].amount.toString()))
        .accountsPartial({
          user: adminPublicKey,
          payer: adminPublicKey,
          sourceDeposit: adminDepositPda,
          destinationDeposit: destDepositPda,
          tokenMint,
          systemProgram: SystemProgram.programId,
          sessionToken: null,
        })
        .instruction()
    );
  }

  // 6. Get blockhashes and sign ALL transactions at once — single wallet popup
  const [baseHashInfo, erHashInfo] = await Promise.all([
    connection.getLatestBlockhash(),
    erConn.getLatestBlockhash(),
  ]);

  const baseTx = new Transaction({ recentBlockhash: baseHashInfo.blockhash, feePayer: adminPublicKey });
  baseTx.add(...baseIxs);

  const erTx = new Transaction({ recentBlockhash: erHashInfo.blockhash, feePayer: adminPublicKey });
  erTx.add(...erIxs);

  console.log("[fund] signing", baseIxs.length, "base chain ixs +", erIxs.length, "ER ixs in one wallet popup");
  const [signedBaseTx, signedErTx] = await client.wallet.signAllTransactions([baseTx, erTx]);

  // 7. Send base chain tx and wait for delegation to propagate
  const delegationWatcher = waitForAccountOwnerChange(connection, adminDepositPda, DELEGATION_PROGRAM_ID);
  try {
    const baseSig = await connection.sendRawTransaction(signedBaseTx.serialize(), { skipPreflight: false });
    console.log("[fund] base tx sent:", baseSig);
    await connection.confirmTransaction(
      { signature: baseSig, blockhash: baseHashInfo.blockhash, lastValidBlockHeight: baseHashInfo.lastValidBlockHeight },
      "confirmed"
    );
    console.log("[fund] base tx confirmed, waiting for delegation propagation...");
    await delegationWatcher.wait();
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log("[fund] delegation propagated");
  } catch (err) {
    await delegationWatcher.cancel();
    throw err;
  }

  // 8. Send ER batch transfer
  const adminBefore = await client.getEphemeralDeposit(adminPublicKey, tokenMint);
  console.log("[DEBUG] admin ER balance BEFORE transfers:", adminBefore?.amount?.toString() ?? "null");

  await runWithSuppressAlreadyProcessed("ER batch transfer", () =>
    erConn.sendRawTransaction(signedErTx.serialize(), { skipPreflight: true })
  );

  const adminAfter = await client.getEphemeralDeposit(adminPublicKey, tokenMint);
  console.log("[DEBUG] admin ER balance AFTER transfers:", adminAfter?.amount?.toString() ?? "null");
  console.log("[fund] all transfers complete");
}

/** Employee flow: read private balance from the TEE */
export async function getPrivateBalance(
  client: LoyalPrivateTransactionsClient,
  employeePublicKey: PublicKey
): Promise<bigint> {
  const tokenMint = new PublicKey(USDC_MINT_DEVNET);
  const deposit = await client.getEphemeralDeposit(employeePublicKey, tokenMint);
  console.log("[DEBUG] getEphemeralDeposit for", employeePublicKey.toString(), "→", deposit);
  return deposit?.amount ?? 0n;
}

/** Employee flow: claim (undelegate + withdraw) — single wallet popup */
export async function claimSalary(
  client: LoyalPrivateTransactionsClient,
  employeePublicKey: PublicKey,
  amount: bigint
): Promise<void> {
  const tokenMint = new PublicKey(USDC_MINT_DEVNET);
  const userTokenAccount = getAssociatedTokenAddressSync(tokenMint, employeePublicKey);
  const magicProgram = new PublicKey(MAGIC_PROGRAM_ID);
  const magicContext = new PublicKey(MAGIC_CONTEXT_ID);
  const connection = new Connection(BASE_RPC, { wsEndpoint: BASE_WS });
  const erConn: Connection = client.ephemeralProgram.provider.connection;
  const [depositPda] = findDepositPda(employeePublicKey, tokenMint);

  const empState = await getDepositState(connection, employeePublicKey, tokenMint);

  // Build withdraw instruction (base chain)
  const [vaultPda] = findVaultPda(tokenMint);
  const vaultTokenAccount = getAssociatedTokenAddressSync(
    tokenMint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID
  );
  const kaminoAccounts = getKaminoAccounts(tokenMint);
  const vaultCollateralTokenAccount = kaminoAccounts
    ? getAssociatedTokenAddressSync(kaminoAccounts.reserveCollateralMint, vaultPda, true, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID)
    : null;
  let withdrawBuilder = client.baseProgram.methods
    .modifyBalance({ amount: new BN(amount.toString()), increase: false })
    .accountsPartial({
      payer: employeePublicKey,
      user: employeePublicKey,
      vault: vaultPda,
      deposit: depositPda,
      userTokenAccount,
      vaultTokenAccount,
      tokenMint,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    });
  if (kaminoAccounts && vaultCollateralTokenAccount) {
    withdrawBuilder = withdrawBuilder.remainingAccounts([
      { pubkey: kaminoAccounts.lendingMarket, isSigner: false, isWritable: false },
      { pubkey: kaminoAccounts.lendingMarketAuthority, isSigner: false, isWritable: false },
      { pubkey: kaminoAccounts.reserve, isSigner: false, isWritable: true },
      { pubkey: kaminoAccounts.reserveLiquiditySupply, isSigner: false, isWritable: true },
      { pubkey: kaminoAccounts.reserveCollateralMint, isSigner: false, isWritable: true },
      { pubkey: vaultCollateralTokenAccount, isSigner: false, isWritable: true },
      { pubkey: kaminoAccounts.instructionSysvarAccount, isSigner: false, isWritable: false },
      { pubkey: kaminoAccounts.klendProgram, isSigner: false, isWritable: false },
    ]);
  }
  const withdrawIx = await withdrawBuilder.instruction();

  if (!empState.delegated) {
    // Already undelegated — just withdraw, single tx, single sign
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    const withdrawTx = new Transaction({ recentBlockhash: blockhash, feePayer: employeePublicKey });
    withdrawTx.add(withdrawIx);
    const [signed] = await client.wallet.signAllTransactions([withdrawTx]);
    const sig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
    await connection.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight }, "confirmed");
    return;
  }

  // Build undelegate instruction (ER tx — commits ER state to base chain)
  const undelegateIx = await client.ephemeralProgram.methods
    .undelegate()
    .accountsPartial({
      user: employeePublicKey,
      payer: employeePublicKey,
      deposit: depositPda,
      magicProgram,
      magicContext,
      sessionToken: null,
    })
    .instruction();

  // Get blockhashes for both chains in parallel
  const [erHashInfo, baseHashInfo] = await Promise.all([
    erConn.getLatestBlockhash(),
    connection.getLatestBlockhash(),
  ]);

  const undelegateTx = new Transaction({ recentBlockhash: erHashInfo.blockhash, feePayer: employeePublicKey });
  undelegateTx.add(undelegateIx);

  const withdrawTx = new Transaction({ recentBlockhash: baseHashInfo.blockhash, feePayer: employeePublicKey });
  withdrawTx.add(withdrawIx);

  // Sign both at once — single wallet popup
  console.log("[claim] signing undelegate (ER) + withdraw (base) in one wallet popup");
  const [signedUndelegateTx, signedWithdrawTx] = await client.wallet.signAllTransactions([
    undelegateTx,
    withdrawTx,
  ]);

  // Send undelegate to ER, wait for base chain to reflect ownership back to PROGRAM_ID
  const undelegationWatcher = waitForAccountOwnerChange(connection, depositPda, PROGRAM_ID);
  try {
    await erConn.sendRawTransaction(signedUndelegateTx.serialize(), { skipPreflight: true });
    console.log("[claim] undelegate sent, waiting for base chain propagation...");
    await undelegationWatcher.wait();
    console.log("[claim] undelegation propagated, waiting for RPC consistency...");
    await new Promise((r) => setTimeout(r, 3000));
  } catch (err: any) {
    await undelegationWatcher.cancel();
    if (!err?.message?.includes("already been processed")) throw err;
    console.log("[claim] undelegate already processed, continuing");
    await new Promise((r) => setTimeout(r, 3000));
  }

  // Send withdraw to base chain — skipPreflight avoids simulation racing ahead of propagation
  const withdrawSig = await connection.sendRawTransaction(signedWithdrawTx.serialize(), { skipPreflight: true });
  await connection.confirmTransaction(
    { signature: withdrawSig, blockhash: baseHashInfo.blockhash, lastValidBlockHeight: baseHashInfo.lastValidBlockHeight },
    "confirmed"
  );
  console.log("[claim] withdrawal confirmed:", withdrawSig);
}
