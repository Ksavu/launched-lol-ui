import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_URL } from '../../../lib/rpc';

const connection = new Connection(RPC_URL, 'confirmed');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');

export interface TaxEvent {
  signature: string;
  mint: string;
  user: string;
  type: 'buy' | 'sell';
  reason: 'block0' | 'ath';
  tax: number; // SOL
  timestamp: number;
}

let cache: { at: number; data: any } | null = null;

export async function GET() {
  try {
    if (cache && Date.now() - cache.at < 30_000) return NextResponse.json(cache.data);

    const sigs = await connection.getSignaturesForAddress(BONDING_CURVE_PROGRAM_ID, { limit: 100 });
    const events: TaxEvent[] = [];

    for (const sig of sigs) {
      if (sig.err) continue;
      try {
        const tx = await connection.getParsedTransaction(sig.signature, { maxSupportedTransactionVersion: 0 });
        if (!tx?.meta?.logMessages || !tx.blockTime) continue;
        const logs = tx.meta.logMessages;
        const taxLog = logs.map((l) => l.match(/Jeet tax: (\d+) SOL \((block0|ath)\)/)).find(Boolean);
        if (!taxLog) continue;

        const ix: any = tx.transaction.message.instructions.find(
          (i: any) => i.programId?.toBase58?.() === BONDING_CURVE_PROGRAM_ID.toBase58()
        );
        const mint = ix?.accounts?.[2]?.toBase58?.() ?? '';
        const isSell = logs.some((l) => /^Program log: Sold /.test(l));
        events.push({
          signature: sig.signature,
          mint,
          user: tx.transaction.message.accountKeys[0]?.pubkey.toBase58() ?? 'unknown',
          type: isSell ? 'sell' : 'buy',
          reason: taxLog[2] as 'block0' | 'ath',
          tax: parseInt(taxLog[1]) / 1e9,
          timestamp: tx.blockTime,
        });
      } catch {
        continue;
      }
    }

    events.sort((a, b) => b.timestamp - a.timestamp);

    const byUser = new Map<string, { user: string; tax: number; count: number }>();
    for (const e of events) {
      const cur = byUser.get(e.user) || { user: e.user, tax: 0, count: 0 };
      cur.tax += e.tax;
      cur.count += 1;
      byUser.set(e.user, cur);
    }
    const hall = [...byUser.values()].sort((a, b) => b.tax - a.tax).slice(0, 20);
    const totalTax = events.reduce((s, e) => s + e.tax, 0);

    const data = { events: events.slice(0, 50), hall, totalTax, taxedTrades: events.length };
    cache = { at: Date.now(), data };
    return NextResponse.json(data);
  } catch (error) {
    console.error('tax-feed error', error);
    return NextResponse.json({ events: [], hall: [], totalTax: 0, taxedTrades: 0 }, { status: 200 });
  }
}
