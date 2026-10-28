import { Keypair } from '@solana/web3.js';

self.onmessage = (e: MessageEvent<{ suffix: string }>) => {
  const { suffix } = e.data;
  let n = 0;
  let batch = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const kp = Keypair.generate();
    n++;
    batch++;
    if (kp.publicKey.toBase58().endsWith(suffix)) {
      (self as any).postMessage({ type: 'found', secretKey: kp.secretKey, attempts: n });
      return;
    }
    if (batch === 2000) {
      (self as any).postMessage({ type: 'progress', attempts: batch });
      batch = 0;
    }
  }
};
