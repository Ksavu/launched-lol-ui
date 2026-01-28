'use client';

import { Header } from '../components/Header';
import Link from 'next/link';
import { ArrowRightIcon, RocketLaunchIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold text-white mb-4 sm:mb-6">
            Launch Your Token
            <span className="block text-yellow-400 mt-2">
              The Fair Way
            </span>
          </h1>
          <p className="text-base sm:text-xl text-gray-400 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Create and trade Solana tokens with bonding curves. No presales, no team allocations. 
            Just fair launches for everyone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
            <Link 
              href="/create"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition text-sm sm:text-base"
            >
              Create Token
              <ArrowRightIcon className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
            <Link 
              href="/tokens"
              className="inline-flex items-center justify-center px-6 sm:px-8 py-3 sm:py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition border-2 border-yellow-400 text-sm sm:text-base"
            >
              Explore Tokens
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="bg-gray-900 p-6 sm:p-8 rounded-xl border-2 border-yellow-400/20 hover:border-yellow-400 transition">
            <RocketLaunchIcon className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400 mb-3 sm:mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Two-Tier Launches</h3>
            <p className="text-sm sm:text-base text-gray-400">
              Choose Free for quick launches or Premium (0.5 SOL) for featured placement, 
              anti-bot protection, and more visibility.
            </p>
          </div>

          <div className="bg-gray-900 p-6 sm:p-8 rounded-xl border-2 border-yellow-400/20 hover:border-yellow-400 transition">
            <ShieldCheckIcon className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400 mb-3 sm:mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Fair Launch Protection</h3>
            <p className="text-sm sm:text-base text-gray-400">
              Optional anti-bot features for Premium tokens. 60-second countdown before trading 
              and purchase limits to prevent sniping.
            </p>
          </div>

          <div className="bg-gray-900 p-6 sm:p-8 rounded-xl border-2 border-yellow-400/20 hover:border-yellow-400 transition sm:col-span-2 md:col-span-1">
            <ChartBarIcon className="h-10 w-10 sm:h-12 sm:w-12 text-yellow-400 mb-3 sm:mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Bonding Curve Trading</h3>
            <p className="text-sm sm:text-base text-gray-400">
              Fair pricing that increases with demand. Graduates to Raydium at 81 SOL. 
              No rug pulls, no team dumps.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-2xl p-8 sm:p-12 text-center">
          <div className="grid grid-cols-3 gap-4 sm:gap-8">
            <div>
              <div className="text-2xl sm:text-4xl font-bold text-black mb-1 sm:mb-2">0</div>
              <div className="text-xs sm:text-base text-gray-900">Tokens Launched</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-bold text-black mb-1 sm:mb-2">$0</div>
              <div className="text-xs sm:text-base text-gray-900">Total Volume</div>
            </div>
            <div>
              <div className="text-2xl sm:text-4xl font-bold text-black mb-1 sm:mb-2">0</div>
              <div className="text-xs sm:text-base text-gray-900">Graduated</div>
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