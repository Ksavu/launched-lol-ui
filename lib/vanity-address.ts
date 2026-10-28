import { Keypair } from '@solana/web3.js';

// NOTE: base58 has no lowercase "l" (or "0", "O", "I"), so "...lol" is impossible.
// The closest valid suffix is "LoL".
export const VANITY_SUFFIX = 'LoL';

export interface VanityResult {
  keypair: Keypair;
  address: string;
  attempts: number;
}

export interface VanityHandle {
  promise: Promise<VanityResult | null>;
  cancel: () => void;
}

/** Start grinding on all CPU cores (web workers). Call cancel() to stop. */
export function startVanityGrind(
  suffix: string = VANITY_SUFFIX,
  onProgress?: (attempts: number) => void,
  maxAttempts = 100_000_000
): VanityHandle {
  const cores = Math.min(typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4, 8);
  const workers: Worker[] = [];
  let finishFn: (r: VanityResult | null) => void = () => {};
  let done = false;
  let total = 0;

  const promise = new Promise<VanityResult | null>((resolve) => {
    const finish = (result: VanityResult | null) => {
      if (done) return;
      done = true;
      workers.forEach((w) => w.terminate());
      resolve(result);
    };
    finishFn = finish;
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
        w.onerror = (err) => {
          console.error('vanity worker error', err);
          finish(null);
        };
        w.postMessage({ suffix });
        workers.push(w);
      }
    } catch (err) {
      console.error('could not start vanity workers', err);
      finish(null);
    }
  });

  return { promise, cancel: () => finishFn(null) };
}
