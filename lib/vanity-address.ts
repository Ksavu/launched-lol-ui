import { Keypair } from '@solana/web3.js';

export interface VanityResult {
  keypair: Keypair;
  address: string;
  attempts: number;
}

/** Grind a keypair whose base58 address ends with `suffix`. Yields to the UI between batches. */
export async function generateVanityAddress(
  suffix: string,
  maxAttempts = 2_000_000,
  onProgress?: (attempts: number) => void
): Promise<VanityResult | null> {
  let attempts = 0;
  while (attempts < maxAttempts) {
    for (let i = 0; i < 2000; i++) {
      const keypair = Keypair.generate();
      attempts++;
      const address = keypair.publicKey.toBase58();
      if (address.endsWith(suffix)) return { keypair, address, attempts };
    }
    onProgress?.(attempts);
    await new Promise((r) => setTimeout(r, 0));
  }
  return null;
}
