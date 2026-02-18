'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { PremiumBadge } from '../../components/PremiumBadge';
import Image from 'next/image';
import Link from 'next/link';

interface Token {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  description: string;
  solCollected: number;
  tokensSold: number;
  progress: number;
  marketCap: number;
  isActive: boolean;
  graduated: boolean;
  category: string;
  isPremium?: boolean;
}

export default function Explore() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'graduated'>('all');
  const [category, setCategory] = useState<'all' | 'meme' | 'ai' | 'gaming' | 'defi' | 'nft' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'mcap' | 'time' | 'volume'>('mcap');

  useEffect(() => {
    fetchTokens();
  }, []);

  const fetchTokens = async () => {
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      setTokens(data.tokens || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTokens = tokens.filter((token) => {
    // Status filter
    if (filter === 'active' && !token.isActive) return false;
    if (filter === 'graduated' && !token.isActive) return false;
    
    // Category filter
    if (category !== 'all' && token.category !== category) return false;
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Premium filter
    if (showPremiumOnly && !token.isPremium) return false;
    
    return true;
  }).sort((a, b) => {
    // Sort
    switch (sortBy) {
      case 'mcap':
        return b.marketCap - a.marketCap;
      case 'time':
        return 0; // Add createdAt field if you want time sorting
      case 'volume':
        return b.solCollected - a.solCollected;
      default:
        return 0;
    }
  });

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Explore Tokens
          </h1>
          <p className="text-gray-400">
            Discover trending tokens on the bonding curve
          </p>
        </div>

        {/* Search & Sort */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border-2 border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 Search by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
            >
              <option value="mcap">💰 Market Cap</option>
              <option value="volume">📊 Volume</option>
              <option value="time">🕐 Recent</option>
            </select>
          </div>

          {/* Premium Toggle */}
          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={showPremiumOnly}
              onChange={(e) => setShowPremiumOnly(e.target.checked)}
              className="w-5 h-5 accent-yellow-400"
            />
            <span className="text-white font-semibold flex items-center gap-2">
              <span>⭐</span>
              <span>Premium Only</span>
            </span>
          </label>
        </div>

        {/* Status Filters */}
        <div className="mb-6">
          <div className="flex gap-4">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'all'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              All ({tokens.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'active'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Active ({tokens.filter((t) => t.isActive).length})
            </button>
            <button
              onClick={() => setFilter('graduated')}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === 'graduated'
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              Graduated ({tokens.filter((t) => t.graduated).length})
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="mb-8">
          <div className="flex gap-3 flex-wrap">
            {['All', 'Meme', 'AI', 'Gaming', 'DeFi', 'NFT', 'Other'].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat.toLowerCase() as any)}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition ${
                  category === cat.toLowerCase()
                    ? 'bg-yellow-400/20 text-yellow-400 border-2 border-yellow-400'
                    : 'bg-gray-800 text-gray-400 border-2 border-transparent hover:border-gray-600'
                }`}
              >
                {cat === 'All' ? '📦 All' : 
                 cat === 'Meme' ? '🎭 Meme' :
                 cat === 'AI' ? '🤖 AI' :
                 cat === 'Gaming' ? '🎮 Gaming' :
                 cat === 'DeFi' ? '💰 DeFi' :
                 cat === 'NFT' ? '🖼️ NFT' : '📦 Other'}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-yellow-400"></div>
            <p className="text-white mt-4">Loading tokens...</p>
          </div>
        )}

        {/* No Results */}
        {!loading && filteredTokens.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">
              {searchQuery ? 'No tokens found matching your search' : 'No tokens found'}
            </p>
          </div>
        )}

        {/* Token Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTokens.map((token) => (
            <Link
              key={token.address}
              href={`/token/${token.address}`}
              className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800 hover:border-yellow-400 transition group"
            >
              {/* Token Image */}
              <div className="relative w-full aspect-square mb-4 rounded-lg overflow-hidden bg-gray-800">
                {token.isPremium && (
                  <div className="absolute top-2 right-2 z-10">
                    <PremiumBadge />
                  </div>
                )}
                {token.imageUrl ? (
                  <Image
                    src={token.imageUrl}
                    alt={token.name}
                    fill
                    className="object-cover group-hover:scale-110 transition"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">
                    🪙
                  </div>
                )}
              </div>

              {/* Token Info */}
              <div className="mb-4">
                <h3 className="text-xl font-bold text-white mb-1 group-hover:text-yellow-400 transition">
                  {token.name}
                </h3>
                <p className="text-gray-400 text-sm">${token.symbol}</p>
              </div>

              {/* Stats */}
              <div className="space-y-3">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-white font-semibold">
                      {token.progress.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-2">
                    <div
                      className="bg-yellow-400 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(token.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Market Cap */}
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Market Cap</span>
                  <span className="text-white font-semibold">
                    ${token.marketCap >= 1000 
                      ? `${(token.marketCap / 1000).toFixed(1)}K` 
                      : token.marketCap.toFixed(0)}
                  </span>
                </div>

                {/* SOL Collected */}
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Volume</span>
                  <span className="text-white font-semibold">
                    {token.solCollected.toFixed(2)} SOL
                  </span>
                </div>

                {/* Status Badge */}
                {token.graduated && (
                  <div className="pt-2">
                    <span className="inline-block bg-green-500/20 text-green-400 text-xs font-semibold px-3 py-1 rounded-full">
                      🎓 Graduated
                    </span>
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}