'use client';

import { use, useState, useEffect } from 'react';
import { Header } from '../../../components/Header';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

interface TokenData {
  mint: string;
  name: string;
  symbol: string;
  imageUrl: string;
  description: string;
  tier: string;
  category: string;
  creator: string;
  launchTime: number;
  tokensSold: number;
  solCollected: number;
  isActive: boolean;
}

export default function TokenDetailPage({ params }: { params: Promise<{ mint: string }> }) {
  // Unwrap params Promise
  const unwrappedParams = use(params);
  const mint = unwrappedParams.mint;
  
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [isBuying, setIsBuying] = useState(false);

  useEffect(() => {
    loadToken();
  }, [mint]);

  const loadToken = async () => {
    try {
      setLoading(true);
      
      // TODO: Fetch real token data from on-chain
      // Mock data for now
      const mockToken: TokenData = {
        mint: mint,
        name: 'Test Token',
        symbol: 'TEST',
        imageUrl: 'https://gateway.pinata.cloud/ipfs/QmUxobLxr8dD3RbLhuvwFw8vuxBcfiigx1f2kxrik3YSYg',
        description: 'A test token created on Launched.lol',
        tier: 'Premium',
        category: 'Meme',
        creator: 'GtcpcvS3k24MA3Yhs6bAd1spkdjYmx82KqRxSk6pPWhE',
        launchTime: Date.now() - 3600000,
        tokensSold: 50000000,
        solCollected: 0.5,
        isActive: true,
      };
      
      setToken(mockToken);
    } catch (error) {
      console.error('Error loading token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!connected || !publicKey) {
      alert('Please connect your wallet!');
      return;
    }

    setIsBuying(true);
    try {
      // TODO: Implement buy logic
      console.log('Buying', buyAmount, 'SOL worth of tokens');
      alert('Buy functionality coming soon!');
    } catch (error) {
      console.error('Buy error:', error);
      alert('Error buying tokens');
    } finally {
      setIsBuying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="inline-block w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Token Not Found</h1>
          <Link href="/tokens" className="text-yellow-400 hover:text-yellow-500">
            ← Back to Tokens
          </Link>
        </div>
      </div>
    );
  }

  const progress = (token.solCollected / 81) * 100;

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link 
          href="/tokens"
          className="inline-flex items-center text-gray-400 hover:text-white mb-6 transition"
        >
          <ArrowLeftIcon className="w-5 h-5 mr-2" />
          Back to Tokens
        </Link>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Token Info */}
          <div>
            {/* Token Image */}
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden border-2 border-gray-800 mb-6">
              <Image
                src={token.imageUrl}
                alt={token.name}
                fill
                className="object-cover"
              />
            </div>

            {/* Token Details */}
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800">
              <h1 className="text-3xl font-bold text-white mb-2">{token.name}</h1>
              <p className="text-xl text-gray-400 mb-4">${token.symbol}</p>
              
              <p className="text-gray-300 mb-6">{token.description}</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Category</p>
                  <p className="text-white font-semibold">{token.category}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tier</p>
                  <p className="text-white font-semibold">{token.tier}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 mb-1">Creator</p>
                  <p className="text-white font-mono text-sm truncate">{token.creator}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Trading */}
          <div>
            {/* Progress to Graduation */}
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800 mb-6">
              <h2 className="text-xl font-bold text-white mb-4">Bonding Curve Progress</h2>
              
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-400">Progress to Raydium</span>
                  <span className="text-white font-semibold">{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Tokens Sold</p>
                  <p className="text-white font-semibold">{(token.tokensSold / 1e6).toFixed(1)}M</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">SOL Collected</p>
                  <p className="text-white font-semibold">{token.solCollected.toFixed(2)} SOL</p>
                </div>
              </div>
            </div>

            {/* Buy Interface */}
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800">
              <h2 className="text-xl font-bold text-white mb-4">Buy Tokens</h2>

              {!connected ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Connect your wallet to trade</p>
                </div>
              ) : (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-2">
                      Amount (SOL)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={buyAmount}
                      onChange={(e) => setBuyAmount(e.target.value)}
                      className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
                      placeholder="0.1"
                    />
                  </div>

                  <button
                    onClick={handleBuy}
                    disabled={isBuying || !token.isActive}
                    className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-4 rounded-lg transition"
                  >
                    {isBuying ? 'Buying...' : 'Buy Tokens'}
                  </button>

                  <p className="text-xs text-gray-500 text-center mt-3">
                    1% trading fee applies
                  </p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="bg-gray-900 rounded-xl p-6 border-2 border-gray-800 mt-6">
              <h3 className="text-lg font-bold text-white mb-4">Token Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Cap</span>
                  <span className="text-white font-semibold">
                    ${(token.solCollected * 188).toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Holders</span>
                  <span className="text-white font-semibold">--</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-green-400 font-semibold">
                    {token.isActive ? 'Active' : 'Graduated'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}