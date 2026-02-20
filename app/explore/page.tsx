'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { PremiumBadge } from '../../components/PremiumBadge';
import Image from 'next/image';
import Link from 'next/link';
import { getSolPrice, formatMarketCap } from '@/lib/price-utils';

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
  virtualSolReserves: number;
  virtualTokenReserves: number;
  totalSupply: number;
  verified?: boolean;
}

export default function Explore() {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'graduated'>('all');
  const [category, setCategory] = useState<'all' | 'meme' | 'ai' | 'gaming' | 'defi' | 'nft' | 'other'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPremiumOnly, setShowPremiumOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'mcap' | 'time' | 'volume'>('mcap');
  const [solPrice, setSolPrice] = useState(100);

  useEffect(() => {
    fetchTokens();
  }, []);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const price = await getSolPrice();
        setSolPrice(price);
      } catch (error) {
        console.error('Error updating SOL price:', error);
      }
    };
    
    fetchPrice();
    const interval = setInterval(fetchPrice, 60000);
    
    return () => clearInterval(interval);
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

  const calculateMarketCap = (token: Token) => {
    if (token.graduated) {
      // Post-graduation: Raydium pool pricing
      const LP_TOKENS = 200_000_000;
      const LP_SOL = 75;
      const TOTAL_SUPPLY = 1_000_000_000;
      
      return (TOTAL_SUPPLY / LP_TOKENS) * LP_SOL * solPrice;
    } else {
      // Pre-graduation: Bonding curve pricing
      const solReserves = token.virtualSolReserves / 1e9;
      const tokenReserves = token.virtualTokenReserves / 1e6;
      
      if (tokenReserves > 0) {
        const pricePerToken = solReserves / tokenReserves;
        const TOTAL_SUPPLY = 1_000_000_000;
        return TOTAL_SUPPLY * pricePerToken * solPrice;
      }
    }
    return 0;
  };

  const filteredTokens = tokens.filter((token) => {
    if (filter === 'active' && !token.isActive) return false;
    if (filter === 'graduated' && !token.graduated) return false;
    if (category !== 'all' && token.category !== category) return false;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        token.name.toLowerCase().includes(query) ||
        token.symbol.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    if (showPremiumOnly && !token.isPremium) return false;
    
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'mcap':
        return calculateMarketCap(b) - calculateMarketCap(a);
      case 'time':
        return 0;
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                Explore Tokens
              </h1>
              <p className="text-gray-400">
                Discover trending tokens on the bonding curve
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-sm">SOL Price</p>
              <p className="text-white text-2xl font-bold">${solPrice.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Search & Sort */}
        <div className="bg-gray-900 rounded-xl p-6 mb-6 border-2 border-gray-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="🔍 Search by name, symbol, or address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
              />
            </div>

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
          {filteredTokens.map((token) => {
            const marketCap = calculateMarketCap(token);
            
            return (
              <Link
                key={token.address}
                href={`/token/${token.address}`}
                className="bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-800 hover:border-yellow-400 transition group"
              >
                {/* Image */}
                <div className="aspect-square bg-gray-800 relative overflow-hidden">
                  {token.isPremium && (
                    <div className="absolute top-3 right-3 z-10">
                      <PremiumBadge />
                    </div>
                  )}
                  {token.graduated && (
                    <div className="absolute top-3 left-3 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10">
                      🎓 GRADUATED
                    </div>
                  )}
                  {token.verified && (
                    <div className="absolute bottom-3 right-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-bold z-10 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                    </svg>
                          VERIFIED
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

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-white font-bold text-lg truncate flex-1">
                      {token.name}
                    </h3>
                    <span className="text-yellow-400 font-bold ml-2">${token.symbol}</span>
                  </div>

                  {/* Market Cap */}
                  <div className="mb-3">
                    <p className="text-gray-400 text-xs">Market Cap</p>
                    <p className="text-white text-xl font-bold">
                      {formatMarketCap(marketCap)}
                    </p>
                  </div>

                  {/* Progress or Graduated Badge */}
                  {token.graduated ? (
                    <div className="mb-3">
                      <div className="bg-green-500/20 border border-green-500 rounded-lg p-2 text-center">
                        <p className="text-green-400 font-bold text-sm">🎓 100% - Graduated</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-400">Progress</span>
                        <span className="text-yellow-400 font-bold">
                          {Math.min(token.progress, 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(token.progress, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">
                        {token.graduated ? 'Final Raise' : 'SOL Raised'}
                      </p>
                      <p className="text-white font-bold">
                        {token.graduated ? '81.00 SOL' : `${token.solCollected.toFixed(2)} SOL`}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Holders</p>
                      <p className="text-white font-bold">--</p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}