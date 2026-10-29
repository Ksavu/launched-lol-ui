'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header, Logo } from '../components/Header';
import { getSolPrice } from '../lib/price-utils';

interface ListedToken {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  marketCap: number;
  progress: number;
  graduated: boolean;
  isActive: boolean;
  isPremium?: boolean;
}

type Tab = 'trending' | 'almost' | 'graduated';

const TABS: { id: Tab; label: string }[] = [
  { id: 'trending', label: '🔥 Trending' },
  { id: 'almost', label: '🚀 Almost graduated' },
  { id: 'graduated', label: '🏆 Graduated' },
];

function formatUsd(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

export default function Home() {
  const [stats, setStats] = useState({ tokensLaunched: 0, tvl: '0', graduated: 0 });
  const [statsLoading, setStatsLoading] = useState(true);
  const [solPrice, setSolPrice] = useState(100);
  const [tokens, setTokens] = useState<ListedToken[]>([]);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('trending');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/stats');
        setStats(await res.json());
      } catch (e) {
        console.error('Error fetching stats:', e);
      } finally {
        setStatsLoading(false);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/tokens');
        const data = await res.json();
        setTokens(data.tokens || []);
      } catch (e) {
        console.error('Error fetching tokens:', e);
      } finally {
        setTokensLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setSolPrice(await getSolPrice());
      } catch (e) {
        console.error('Error updating SOL price:', e);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  const q = query.trim().toLowerCase();
  const shown = tokens
    .filter((t) => {
      if (tab === 'graduated') return t.graduated;
      if (tab === 'almost') return !t.graduated && t.progress >= 50;
      return !t.graduated;
    })
    .filter((t) => !q || t.name.toLowerCase().includes(q) || t.symbol.toLowerCase().includes(q))
    .slice(0, 8);

  return (
    <div className="min-h-screen bg-white text-ink">
      <Header />

      {/* Hero */}
      <section className="hero-bg">
        <div className="mx-auto grid max-w-7xl items-center gap-6 px-4 pb-14 pt-10 sm:px-6 md:min-h-[540px] md:grid-cols-[1.1fr_.9fr] lg:px-8">
          <div>
            <div className="eyebrow">✦ THE FUN SIDE OF SOLANA</div>
            <h1 className="my-6 text-[clamp(46px,6.1vw,82px)] font-black leading-[1.02] tracking-[-0.06em]">
              Got a meme?
              <br />
              <span className="gradient-text">Launch that thing.</span> 🚀
            </h1>
            <p className="max-w-[520px] text-lg leading-relaxed text-muted">
              Create, discover and trade community tokens on Solana with fair bonding-curve launches—without the
              boring stuff.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/create" className="pill-btn pill-primary">🚀 Launch a token</Link>
              <Link href="/explore" className="pill-btn pill-light">👀 Explore memes</Link>
            </div>
            <div className="mt-6 text-xs text-[#8b8097]">✧ Fair launches &nbsp; ✧ Bonding curves &nbsp; ✧ No presales</div>
          </div>

          <div className="hero-art">
            <span className="spark" style={{ left: '7%', top: '12%' }}>✨</span>
            <span className="spark" style={{ right: '3%', top: '12%' }}>🚀</span>
            <span className="spark" style={{ right: '6%', bottom: '15%' }}>💚</span>
            <span className="spark" style={{ left: '10%', bottom: '8%' }}>🪙</span>
            <div className="halo"><div className="shine" /><div className="smile" /></div>
            <div className="bubble" style={{ right: 0, top: '36%' }}>💜 Meme magic</div>
            <div className="bubble" style={{ left: 0, bottom: '29%' }}>⚡ Powered by Solana</div>
          </div>
        </div>
      </section>

      {/* Live tokens */}
      <section className="bg-lav py-16" id="explore">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="eyebrow">👀 THE MEME ZONE</div>
              <h2 className="mt-2 text-4xl font-black tracking-tight">Find your next obsession.</h2>
              <p className="text-muted">Discover tokens, follow momentum, and do your own research.</p>
            </div>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="⌕  Search tokens..."
              aria-label="Search tokens"
              className="w-full rounded-[20px] border border-[#c8b3df] bg-white px-4 py-3 outline-none focus:border-brand sm:w-60"
            />
          </div>

          <div className="mb-5 flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-full border px-5 py-3 text-sm font-extrabold transition ${
                  tab === t.id ? 'border-ink bg-ink text-white' : 'border-line bg-white text-[#665b72]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tokensLoading ? (
            <p className="text-muted">Loading tokens…</p>
          ) : shown.length === 0 ? (
            <p className="text-muted">Nothing here yet — be the first to launch one.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((t) => (
                <Link key={t.address} href={`/token/${t.address}`} className="card-soft block p-5">
                  <div className="flex items-center gap-3">
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.imageUrl} alt={t.name} className="h-[58px] w-[58px] rounded-[19px] object-cover" />
                    ) : (
                      <div className="grid h-[58px] w-[58px] place-items-center rounded-[19px] bg-panel text-3xl">🪙</div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-[17px] font-bold">{t.name}</h3>
                      <small className="text-muted">${t.symbol}</small>
                    </div>
                  </div>
                  <span className="mt-3 inline-block rounded-full bg-[#e7fff4] px-2.5 py-1.5 text-[10px] font-black text-[#138b59]">
                    {t.graduated ? '✓ Graduated' : t.isPremium ? '✦ Premium' : '✦ Community token'}
                  </span>
                  <div className="mb-2 mt-5 flex justify-between text-xs text-[#7d7586]">
                    <span>Market cap<br /><strong className="text-[#272032]">{formatUsd(t.marketCap)}</strong></span>
                    <span className="text-right">Curve progress<br /><strong className="text-[#272032]">{Math.min(t.progress, 100).toFixed(0)}%</strong></span>
                  </div>
                  <div className="h-[9px] overflow-hidden rounded-full bg-[#d2bce8]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#56149f] via-[#8637dc] to-mint"
                      style={{ width: `${Math.min(t.progress, 100)}%` }}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-8 text-center">
            <Link href="/explore" className="pill-btn pill-light">See all tokens →</Link>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16" id="how">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="eyebrow">⚡ EASY AS 1, 2, LOL</div>
          <h2 className="mt-2 text-4xl font-black tracking-tight">Serious tech. Silly good time.</h2>
          <p className="mb-7 text-muted">Built for simple launches, fair discovery and transparent trading.</p>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              { icon: '🎨', title: 'Make your meme', text: 'Pick a name, add an image and launch in a couple of clicks. Your token address even ends in LoL.' },
              { icon: '🛡️', title: 'Launch the fair way', text: 'Bonding-curve pricing, no presales, and optional Premium anti-bot protection: a launch countdown and purchase limits.' },
              { icon: '📈', title: 'Graduate to Raydium', text: 'Prices rise with demand. At 81 SOL the token graduates and its liquidity moves to Raydium.' },
            ].map((f) => (
              <div key={f.title} className="rounded-[28px] border border-line bg-white p-7 shadow-[0_9px_24px_#5f37821a]">
                <div className="grid h-[58px] w-[58px] place-items-center rounded-[19px] bg-[#d1b1f2] text-3xl">{f.icon}</div>
                <h3 className="mb-2 mt-4 text-xl font-bold">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="bg-lav py-16" id="tiers">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="eyebrow">💜 PICK YOUR VIBE</div>
          <h2 className="mb-7 mt-2 text-4xl font-black tracking-tight">Free or Premium? You do you.</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[28px] border border-line bg-white p-7 shadow-[0_9px_24px_#5f37821a]">
              <div className="grid h-[58px] w-[58px] place-items-center rounded-[19px] bg-[#d1b1f2] text-3xl">🌱</div>
              <h3 className="mb-1 mt-4 text-xl font-bold">Free Launch — 0.02 SOL</h3>
              <p className="text-sm leading-relaxed text-muted">
                Core launchpad features with bonding-curve trading. Your token address ends in <b>LoL</b>. Network
                fees apply.
              </p>
              <Link href="/create" className="pill-btn pill-light mt-6">Choose Free</Link>
            </div>
            <div className="rounded-[28px] border-2 border-brand bg-white p-7 shadow-[0_9px_24px_#5f37821a]">
              <div className="grid h-[58px] w-[58px] place-items-center rounded-[19px] bg-[#d1b1f2] text-3xl">✨</div>
              <h3 className="mb-1 mt-4 text-xl font-bold">Premium Launch — 0.5 SOL</h3>
              <p className="text-sm leading-relaxed text-muted">
                Featured placement, Premium badge, verified socials, optional anti-bot (launch countdown and purchase
                limits), and your choice of a <b>LoL</b> or random token address.
              </p>
              <Link href="/create" className="pill-btn pill-primary mt-6">Choose Premium</Link>
            </div>
          </div>
          <p className="mt-6 rounded-2xl border border-[#f8dfaa] bg-[#fff9ed] px-4 py-3 text-xs text-[#775b2f]">
            Crypto tokens are volatile and can lose value. Only trade what you can afford to lose.
          </p>
        </div>
      </section>

      {/* Stats + CTA */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[38px] bg-gradient-to-r from-[#310967] via-[#7628cd] to-[#16876e] px-6 py-14 text-center text-white shadow-[0_24px_50px_#9945ff26]">
            {statsLoading ? (
              <p>Loading stats…</p>
            ) : (
              <div className="mb-10 grid gap-8 md:grid-cols-3">
                <div>
                  <div className="text-5xl font-black">{stats.tokensLaunched}</div>
                  <div className="text-white/80">Tokens Launched</div>
                </div>
                <div>
                  <div className="text-5xl font-black">{stats.tvl} SOL</div>
                  <div className="text-white/80">Total Value Locked</div>
                  <div className="text-sm text-white/60">
                    ${(parseFloat(stats.tvl) * solPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-5xl font-black">{stats.graduated}</div>
                  <div className="text-white/80">Graduated Tokens</div>
                </div>
              </div>
            )}
            <h2 className="mb-3 text-4xl font-black md:text-5xl">Your idea. Your meme. Your launch. 🚀</h2>
            <p className="mb-6 text-white/90">Ready to make something the internet won&apos;t forget?</p>
            <Link href="/create" className="pill-btn pill-green">Launch your token →</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line py-8 text-sm text-[#918a9d]">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3"><Logo className="text-lg text-ink" /> © 2026 · Made for meme lovers on Solana</div>
          <div>Independent project · Not affiliated with Solana Labs</div>
        </div>
      </footer>
    </div>
  );
}
