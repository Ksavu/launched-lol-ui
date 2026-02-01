'use client';

import { useState, useEffect } from 'react';
import { Header } from '../../components/Header';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Link from 'next/link';
import Image from 'next/image';

interface Token {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  tier: string;
  category: string;
  creator: string;
  launchTime: number;
}

export default function TokensPage() {
  const { connection } = useConnection();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    loadTokens();
  }, []);

  const loadTokens = async () => {
    try {
      setLoading(true);
      
      // TODO: Fetch tokens from on-chain
      // For now, mock data
      const mockTokens: Token[] = [
        {
          mint: 'Dp94yvNq4czWcAKg27YTCroqWJeCa9y4BKPuaAudi1br',
          name: 'Test Token',
          symbol: 'TEST',
          imageUrl: 'https://gateway.pinata.cloud/ipfs/QmUxobLxr8dD3RbLhuvwFw8vuxBcfiigx1f2kxrik3YSYg',
          tier: 'Premium',
          category: 'Meme',
          creator: 'GtcpcvS3k24MA3Yhs6bAd1spkdjYmx82KqRxSk6pPWhE',
          launchTime: Date.now() - 3600000,
        },
      ];
      
      setTokens(mockTokens);
    } catch (error) {
      console.error('Error loading tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTokens = filter === 'all' 
    ? tokens 
    : tokens.filter(t => t.category.toLowerCase() === filter);

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Explore Tokens
          </h1>
          <p className="text-gray-400">
            Trade tokens on fair bonding curves
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-8 justify-center">
          {['all', 'meme', 'ai', 'gaming', 'defi', 'nft', 'other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                filter === cat
                  ? 'bg-yellow-400 text-black'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Tokens Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 mt-4">Loading tokens...</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 text-xl mb-6">No tokens found</p>
            <Link
              href="/create"
              className="inline-block px-8 py-4 bg-yellow-400 hover:bg-yellow-500 text-black font-bold rounded-lg transition"
            >
              Create First Token
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTokens.map((token) => (
              <Link
                key={token.mint}
                href={`/token/${token.mint}`}
                className="bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-800 hover:border-yellow-400 transition group"
              >
                {/* Token Image */}
                <div className="relative w-full h-48 bg-gray-800">
                  <Image
                    src={token.imageUrl}
                    alt={token.name}
                    fill
                    unoptimized
                    className="object-cover group-hover:scale-105 transition"
                  />

                  {/* Tier Badge */}
                  {token.tier === 'Premium' && (
                    <div className="absolute top-3 right-3 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                      Premium
                    </div>
                  )}
                </div>

                {/* Token Info */}
                <div className="p-4">
                  <h3 className="text-xl font-bold text-white mb-1 truncate">
                    {token.name}
                  </h3>
                  <p className="text-gray-400 text-sm mb-3">${token.symbol}</p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <span className="bg-gray-800 text-gray-300 px-2 py-1 rounded">
                      {token.category}
                    </span>
                    <span className="text-gray-500">
                      {Math.floor((Date.now() - token.launchTime) / 3600000)}h ago
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}