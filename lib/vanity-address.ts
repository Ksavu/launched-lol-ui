import { Keypair } from '@solana/web3.js';

// NOTE: base58 has no lowercase "l" (or "0", "O", "I"), so "...lol" is impossible.
// The closest valid suffix is "LoL".
export const VANITY_SUFFIX = 'LoL';

export interface VanityResult {
  keypair: Keypair;
  address: string;
  attempts: number;
}

/** Grind a keypair whose base58 address ends with `suffix`, using all CPU cores via web workers. */
export async function generateVanityAddress(
  suffix: string = VANITY_SUFFIX,
  maxAttempts = 20_000_000,
  onProgress?: (attempts: number) => void
): Promise<VanityResult | null> {
  const cores = Math.min(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4, 8);

  return new Promise((resolve) => {
    let total = 0;
    let done = false;
    const workers: Worker[] = [];

    const finish = (result: VanityResult | null) => {
      if (done) return;
      done = true;
      workers.forEach((w) => w.terminate());
      resolve(result);
    };

    try {
      for (let i = 0; i < cores; i++) {
        const w = new Worker(new URL('./vanity-worker.ts', import.meta.url));
        w.onmessage = (e: MessageEvent<any>) => {
          if (e.data.type === 'progress') {
            total += e.data.attempts;
            onProgress?.(total);
            if (total >= maxAttempts) finish(null);
          } else if (e.data.type === 'found') {
            const keypair = Keypair.fromSecretKey(new Uint8Array(e.data.secretKey));
            finish({ keypair, address: keypair.publicKey.toBase58(), attempts: total });
          }
        };
        w.onerror = () => finish(null);
        w.postMessage({ suffix });
        workers.push(w);
      }
    } catch {
      finish(null);
    }
  });
}
