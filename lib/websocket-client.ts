import { Connection, PublicKey, AccountInfo } from '@solana/web3.js';

export type TokenUpdate = {
  tokensSold: number;
  solCollected: number;
  progress: number;
};

type Callback = (data: TokenUpdate) => void;

export class TokenWebSocket {
  private connection: Connection;
  private subscriptionId: number | null = null;
  private pendingUpdate: TokenUpdate | null = null;
  private intervalId: number | null = null; // <--- broj, ne NodeJS.Timer

  constructor(endpoint: string) {
    this.connection = new Connection(endpoint, 'confirmed');
  }

  subscribeToToken(bondingCurveAddress: string, callback: Callback) {
    const pubkey = new PublicKey(bondingCurveAddress);

    this.subscriptionId = this.connection.onAccountChange(
      pubkey,
      (accountInfo) => {
        const data = accountInfo.data;

        const tokensSold = Number(data.readBigUInt64LE(8 + 104)) / 1_000_000;
        const solCollected = Number(data.readBigUInt64LE(8 + 112)) / 1_000_000_000;
        const progress = (solCollected / 81) * 100;

        this.pendingUpdate = { tokensSold, solCollected, progress };
      },
      'confirmed'
    );

    // Browser-safe setInterval
    this.intervalId = window.setInterval(() => {
      if (this.pendingUpdate) {
        callback(this.pendingUpdate);
        this.pendingUpdate = null;
      }
    }, 1000);
  }

  unsubscribe() {
    if (this.subscriptionId !== null) {
      this.connection.removeAccountChangeListener(this.subscriptionId);
      this.subscriptionId = null;
    }
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
