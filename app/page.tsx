'use client';

import { Header } from '../components/Header';
import Link from 'next/link';
import { ArrowRightIcon, RocketLaunchIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Launch Your Token
            <span className="block text-yellow-400 mt-2">
              The Fair Way
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
            Create and trade Solana tokens with bonding curves. No presales, no team allocations. 
            Just fair launches for everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/create"
              className="inline-flex items-center px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition"
            >
              Create Token
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/tokens"
              className="inline-flex items-center px-8 py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition border-2 border-yellow-400"
            >
              Explore Tokens
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-900 p-8 rounded-xl border-2 border-yellow-400/20 hover:border-yellow-400 transition">
            <RocketLaunchIcon className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Two-Tier Launches</h3>
            <p className="text-gray-400">
              Choose Free for quick launches or Premium (0.5 SOL) for featured placement, 
              anti-bot protection, and more visibility.
            </p>
          </div>

          <div className="bg-gray-900 p-8 rounded-xl border-2 border-yellow-400/20 hover:border-yellow-400 transition">
            <ShieldCheckIcon className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Fair Launch Protection</h3>
            <p className="text-gray-400">
              Optional anti-bot features for Premium tokens. 60-second countdown before trading 
              and purchase limits to prevent sniping.
            </p>
          </div>

          <div className="bg-gray-900 p-8 rounded-xl border-2 border-yellow-400/20 hover:border-yellow-400 transition">
            <ChartBarIcon className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Bonding Curve Trading</h3>
            <p className="text-gray-400">
              Fair pricing that increases with demand. Graduates to Raydium at 81 SOL. 
              No rug pulls, no team dumps.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-12 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-black mb-2">0</div>
              <div className="text-gray-900">Tokens Launched</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black mb-2">$0</div>
              <div className="text-gray-900">Total Volume</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-black mb-2">0</div>
              <div className="text-gray-900">Graduated Tokens</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-yellow-400/20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>© 2025 Launched.lol - Fair Token Launches on Solana</p>
        </div>
      </footer>
    </div>
  );
}