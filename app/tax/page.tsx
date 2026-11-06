'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '../../components/Header';

interface TaxEvent {
  signature: string;
  mint: string;
  user: string;
  type: 'buy' | 'sell';
  reason: 'block0' | 'ath';
  tax: number;
  timestamp: number;
}
interface Jeet { user: string; tax: number; count: number }
interface Named { name: string; symbol: string; imageUrl: string }

const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const ago = (ts: number) => {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
};

export default function TaxPage() {
  const [events, setEvents] = useState<TaxEvent[]>([]);
  const [hall, setHall] = useState<Jeet[]>([]);
  const [total, setTotal] = useState(0);
  const [names, setNames] = useState<Record<string, Named>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [f, t] = await Promise.all([fetch('/api/tax-feed'), fetch('/api/tokens')]);
        const feed = await f.json();
        const tokens = (await t.json()).tokens || [];
        setEvents(feed.events || []);
        setHall(feed.hall || []);
        setTotal(feed.totalTax || 0);
        const map: Record<string, Named> = {};
        tokens.forEach((x: any) => (map[x.address] = { name: x.name, symbol: x.symbol, imageUrl: x.imageUrl }));
        setNames(map);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
    const i = setInterval(load, 30000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="eyebrow">🧾 THE JEET TAX</div>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
          Bundle the launch or sell the top?{' '}
          <span className="gradient-text">Pay the tax.</span>
        </h1>
        <p className="mt-3 max-w-2xl text-muted">
          Two behaviors get a <b>10% tax</b>: buying in the very first trading block, and selling within 1% of the
          all-time high. Every taxed lamport stays in the curve and lifts the price, an instant buyback for everyone
          still holding.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="card-soft p-5">
            <div className="text-sm text-muted">Tax collected (recent)</div>
            <div className="text-3xl font-black">{total.toFixed(3)} SOL</div>
          </div>
          <div className="card-soft p-5">
            <div className="text-sm text-muted">🎯 Block-0 buys</div>
            <div className="text-sm text-[#4c4459]">10% on buys in the opening slot of trading (creator exempt)</div>
          </div>
          <div className="card-soft p-5">
            <div className="text-sm text-muted">📈 ATH sells</div>
            <div className="text-sm text-[#4c4459]">10% on sells made within 1% of the token&apos;s all-time-high price</div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-[26px] border border-line bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">Live buybacks</h2>
            {loading ? (
              <p className="text-muted">Loading…</p>
            ) : events.length === 0 ? (
              <p className="text-muted">No taxed trades yet. Everyone&apos;s behaving. 😇</p>
            ) : (
              <ul className="space-y-3">
                {events.map((e) => {
                  const n = names[e.mint];
                  return (
                    <li key={e.signature} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
                      <div className="min-w-0">
                        <div className="truncate font-bold">
                          {e.mint ? (
                            <Link href={`/token/${e.mint}`} className="hover:text-brand">
                              {n ? `$${n.symbol}` : short(e.mint)}
                            </Link>
                          ) : (
                            'Unknown token'
                          )}{' '}
                          <span className="ml-1 rounded-full bg-brand/15 px-2 py-0.5 text-[11px] font-black text-brand">
                            {e.reason === 'block0' ? 'BLOCK 0 BUY' : 'ATH SELL'}
                          </span>
                        </div>
                        <div className="text-xs text-muted">
                          {short(e.user)} · {ago(e.timestamp)}
                        </div>
                      </div>
                      <a
                        href={`https://solscan.io/tx/${e.signature}?cluster=devnet`}
                        target="_blank"
                        rel="noreferrer"
                        className="whitespace-nowrap font-black text-emerald-600"
                      >
                        +{e.tax.toFixed(4)} SOL ↗
                      </a>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-[26px] border border-line bg-white p-6">
            <h2 className="mb-4 text-xl font-bold">🏆 Hall of Jeets</h2>
            {loading ? (
              <p className="text-muted">Loading…</p>
            ) : hall.length === 0 ? (
              <p className="text-muted">Nobody has been taxed yet.</p>
            ) : (
              <ol className="space-y-2">
                {hall.map((j, i) => (
                  <li key={j.user} className="flex items-center justify-between rounded-xl bg-panel px-4 py-2.5">
                    <span className="font-semibold">
                      <span className="mr-2 text-muted">#{i + 1}</span>
                      {short(j.user)}
                    </span>
                    <span className="text-sm">
                      <b>{j.tax.toFixed(3)} SOL</b> <span className="text-muted">· {j.count}×</span>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
