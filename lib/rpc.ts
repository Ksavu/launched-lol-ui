// Set NEXT_PUBLIC_RPC_URL (e.g. a Helius/QuickNode devnet URL) in Vercel + .env.local.
// Falls back to the public devnet RPC, which is rate limited and flaky.
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';
