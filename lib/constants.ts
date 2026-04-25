export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
export const BASE_RPC  = `https://solana-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
// Alchemy mainnet WSS doesn't support signatureSubscribe reliably; use the public mainnet WSS for confirmations
export const BASE_WS   = "wss://api.mainnet-beta.solana.com"
export const EPHEMERAL_RPC = "https://tee.magicblock.app"
export const EPHEMERAL_WS  = "wss://tee.magicblock.app"
// re-export Loyal constants
export { ER_VALIDATOR, MAGIC_PROGRAM_ID, MAGIC_CONTEXT_ID } from "@loyal-labs/private-transactions"
