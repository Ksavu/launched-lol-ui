'use client';

import { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import Link from 'next/link';
import { ArrowRightIcon, RocketLaunchIcon, ShieldCheckIcon, ChartBarIcon } from '@heroicons/react/24/outline';

export default function Home() {
  const [stats, setStats] = useState({
    tokensLaunched: 0,
    tvl: '0',
    graduated: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/stats');
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <Header />
      
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
            Launch Your Token
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
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
              className="inline-flex items-center px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition"
            >
              Create Token
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
            <Link 
              href="/explore"
              className="inline-flex items-center px-8 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
            >
              Explore Tokens
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <RocketLaunchIcon className="h-12 w-12 text-purple-500 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Two-Tier Launches</h3>
            <p className="text-gray-400">
              Choose Free for quick launches or Premium (0.5 SOL) for featured placement, 
              anti-bot protection, and more visibility.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <ShieldCheckIcon className="h-12 w-12 text-green-500 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Fair Launch Protection</h3>
            <p className="text-gray-400">
              Optional anti-bot features for Premium tokens. 60-second countdown before trading 
              and purchase limits to prevent sniping.
            </p>
          </div>

          <div className="bg-gray-800 p-8 rounded-xl border border-gray-700">
            <ChartBarIcon className="h-12 w-12 text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Bonding Curve Trading</h3>
            <p className="text-gray-400">
              Fair pricing that increases with demand. Graduates to Raydium at 81 SOL. 
              No rug pulls, no team dumps.
            </p>
          </div>
        </div>
      </section>

      {/* Stats - UPDATED WITH LIVE DATA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-purple-900 to-pink-900 rounded-2xl p-12 text-center">
          {loading ? (
            <div className="text-white text-xl">Loading stats...</div>
          ) : (
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <div className="text-5xl font-bold text-white mb-2">
                  {stats.tokensLaunched}
                </div>
                <div className="text-gray-300 text-lg">Tokens Launched</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-white mb-2">
                  {stats.tvl} SOL
                </div>
                <div className="text-gray-300 text-lg">Total Value Locked</div>
              </div>
              <div>
                <div className="text-5xl font-bold text-white mb-2">
                  {stats.graduated}
                </div>
                <div className="text-gray-300 text-lg">Graduated Tokens</div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-400">
          <p>© 2026 Launched.lol - Fair Token Launches on Solana</p>
        </div>
      </footer>
    </div>
  );
}