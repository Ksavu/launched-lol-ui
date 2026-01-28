'use client';

import { Header } from '../components/Header';
import Link from 'next/link';
import { ArrowRightIcon, RocketLaunchIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-black">
      <Header />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white">
            Launch Your Token
            <span className="block bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] bg-clip-text text-transparent">
              The Fair Way
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Create and trade Solana tokens with bonding curves. No presales, no team allocations. 
            Just fair launches for everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/create"
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] text-black font-semibold rounded-lg hover:brightness-105 transition"
            >
              Create Token
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/tokens"
              className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
            >
              Explore Tokens
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <RocketLaunchIcon className="h-12 w-12 text-[#FCD52F] mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Two-Tier Launches</h3>
            <p className="text-gray-300">
              Choose Free for quick launches or Premium (0.5 SOL) for featured placement, 
              anti-bot protection, and more visibility.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <ShieldCheckIcon className="h-12 w-12 text-[#FCD52F] mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Fair Launch Protection</h3>
            <p className="text-gray-300">
              Optional anti-bot features for Premium tokens. 60-second countdown before trading 
              and purchase limits to prevent sniping.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <ChartBarIcon className="h-12 w-12 text-[#FCD52F] mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Bonding Curve Trading</h3>
            <p className="text-gray-300">
              Fair pricing that increases with demand. Graduates to Raydium at 81 SOL. 
              No rug pulls, no team dumps.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Tokens Launched */}
          <div className="bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] p-12 rounded-2xl text-center text-black shadow-lg transform transition hover:scale-105">
            <div className="text-4xl font-bold mb-2">0</div>
            <div>Tokens Launched</div>
          </div>

          {/* Total Volume */}
          <div className="bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] p-12 rounded-2xl text-center text-black shadow-lg transform transition hover:scale-105">
            <div className="text-4xl font-bold mb-2">$0</div>
            <div>Total Volume</div>
          </div>

          {/* Graduated Tokens */}
          <div className="bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] p-12 rounded-2xl text-center text-black shadow-lg transform transition hover:scale-105">
            <div className="text-4xl font-bold mb-2">0</div>
            <div>Graduated Tokens</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-300">
          <p>© 2025 Launched.lol - Fair Token Launches on Solana</p>
        </div>
      </footer>
    </div>
  );
}
