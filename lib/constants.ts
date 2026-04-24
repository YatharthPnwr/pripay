export const USDC_MINT_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
export const BASE_RPC  = `https://solana-devnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
// Alchemy devnet WSS doesn't support signatureSubscribe reliably; use the public devnet WSS for confirmations
export const BASE_WS   = "wss://api.devnet.solana.com"
export const EPHEMERAL_RPC = "https://tee.magicblock.app"
export const EPHEMERAL_WS  = "wss://tee.magicblock.app"
// re-export Loyal constants
export { ER_VALIDATOR, MAGIC_PROGRAM_ID, MAGIC_CONTEXT_ID } from "@loyal-labs/private-transactions"
