'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import { useState } from 'react';

const LINKS = [
  { href: '/explore', label: 'Explore' },
  { href: '/create', label: 'Create Token' },
  { href: '/portfolio', label: 'Portfolio' },
];

export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-black tracking-[-0.06em] ${className}`}>
      launched<i className="not-italic text-brand">.</i>
      <b className="text-[#28c688]">lol</b> ✦
    </span>
  );
}

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-[#e1d3f2]/95 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between gap-6 sm:h-20">
          <Link href="/" className="flex-shrink-0">
            <Logo className="text-2xl sm:text-[28px]" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-[#4c4459] md:flex">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition hover:text-brand">
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <WalletMultiButton />
            <button
              onClick={() => setOpen(!open)}
              aria-label="Menu"
              className="rounded-full p-2 text-[#4c4459] hover:text-brand md:hidden"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {open ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <div className="space-y-1 border-t border-line py-3 md:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block py-2 font-bold text-[#4c4459] transition hover:text-brand"
              >
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
