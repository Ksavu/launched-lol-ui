'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../../../components/Header';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { buyTokens, sellTokens } from '../../../lib/bonding-curve-client';

interface TokenData {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  description: string;
  creator: string;
  bondingCurve: string;
  solCollected: number;
  tokensSold: number;
  progress: number;
  isActive: boolean;
  marketCap: number;
}

export default function TokenPage() {
  const params = useParams();
  const mint = params.mint as string;
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState('0.1');
  const [sellAmount, setSellAmount] = useState('');
  const [trading, setTrading] = useState(false);

  useEffect(() => {
    fetchTokenData();
  }, [mint]);

  const fetchTokenData = async () => {
    try {
      const response = await fetch('/api/tokens');
      const data = await response.json();
      const foundToken = data.tokens.find((t: TokenData) => t.address === mint);
      setToken(foundToken || null);
    } catch (error) {
      console.error('Error fetching token:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async () => {
    if (!connected || !publicKey || !token) {
      alert('Please connect wallet!');
      return;
    }

    setTrading(true);
    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const tx = await buyTokens(
        connection,
        wallet,
        token.address,
        parseFloat(buyAmount)
      );
      
      alert(`✅ Success!\n\nBought tokens!\n\nTX: https://solscan.io/tx/${tx}?cluster=devnet`);
      await fetchTokenData();
    } catch (error) {
      console.error(error);
      alert(`Error: ${error}`);
    } finally {
      setTrading(false);
    }
  };

  const handleSell = async () => {
    if (!connected || !publicKey || !token) {
      alert('Please connect wallet!');
      return;
    }

    setTrading(true);
    try {
      const wallet = { publicKey, signTransaction, signAllTransactions };
      const tx = await sellTokens(
        connection,
        wallet,
        token.address,
        parseFloat(sellAmount)
      );
      
      alert(`✅ Success!\n\nSold tokens!\n\nTX: https://solscan.io/tx/${tx}?cluster=devnet`);
      await fetchTokenData();
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message || error.toString()}`);
    } finally {
      setTrading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-white text-xl">Loading token...</div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-black">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-white text-xl">Token not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Left: Token Info */}
          <div className="order-2 lg:order-1">
            {/* Token Image */}
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900 mb-6">
              {token.imageUrl ? (
                <Image
                  src={token.imageUrl}
                  alt={token.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl">
                  🪙
                </div>
              )}
            </div>

            {/* Token Details */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{token.name}</h1>
              <p className="text-gray-400 text-base sm:text-lg mb-4">${token.symbol}</p>
              
              {token.description && (
                <p className="text-gray-300 mb-6 text-sm sm:text-base">{token.description}</p>
              )}

              {/* Stats */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Market Cap</span>
                  <span className="text-white font-semibold">${token.marketCap.toFixed(2)}</span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">SOL Collected</span>
                  <span className="text-white font-semibold">{token.solCollected.toFixed(3)} SOL</span>
                </div>
                
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Tokens Sold</span>
                  <span className="text-white font-semibold">
                    {token.tokensSold >= 1000000 
                      ? `${(token.tokensSold / 1000000).toFixed(2)}M`
                      : `${(token.tokensSold / 1000).toFixed(1)}K`
                    }
                  </span>
                </div>

                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-semibold ${token.isActive ? 'text-green-400' : 'text-yellow-400'}`}>
                    {token.isActive ? '🟢 Active' : '🎓 Graduated'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-400">Progress to 81 SOL</span>
                  <span className="text-white font-semibold">{token.progress.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-yellow-400 h-3 rounded-full transition-all"
                    style={{ width: `${Math.min(token.progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Contract Address */}
              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-gray-400 text-xs sm:text-sm mb-2">Contract Address</p>
                
                  href={`https://solscan.io/token/${token.address}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-yellow-400 hover:text-yellow-300 text-xs sm:text-sm break-all"
                <a>
                  {token.address}
                </a>
              </div>
            </div>
          </div>

          {/* Right: Trading */}
          <div className="order-1 lg:order-2">
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-yellow-400/20 mb-6">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">Trade</h2>

              {!token.isActive && (
                <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4 mb-6">
                  <p className="text-yellow-400 text-xs sm:text-sm">
                    🎓 This token has graduated and is now trading on Raydium!
                  </p>
                </div>
              )}

              {/* Buy Section */}
              <div className="mb-8">
                <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                  Buy Tokens
                </label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="flex-1 bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white outline-none text-sm sm:text-base"
                    placeholder="SOL"
                  />
                  <button
                    onClick={handleBuy}
                    disabled={trading || !connected || !token.isActive}
                    className="bg-green-500 hover:bg-green-600 disabled:bg-gray-600 text-white font-bold px-4 sm:px-8 py-2 sm:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap"
                  >
                    {trading ? 'Buying...' : 'Buy'}
                  </button>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  ~{((parseFloat(buyAmount) * 0.99 / 81) * 800000000 / 1000000).toFixed(2)}M tokens
                </p>
              </div>

              {/* Sell Section */}
              <div>
                <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                  Sell Tokens
                </label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="number"
                    step="100000"
                    min="100000"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(e.target.value)}
                    className="flex-1 bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white outline-none text-sm sm:text-base"
                    placeholder="Tokens"
                  />
                  <button
                    onClick={handleSell}
                    disabled={trading || !connected || !token.isActive || !sellAmount}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white font-bold px-4 sm:px-8 py-2 sm:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap"
                  >
                    {trading ? 'Selling...' : 'Sell'}
                  </button>
                </div>
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  {sellAmount && parseFloat(sellAmount) > 0
                    ? `~${((parseFloat(sellAmount) / 800000000) * 81 * 0.99).toFixed(4)} SOL`
                    : '1M tokens = 0.0001 SOL'}
                </p>
              </div>

              {!connected && (
                <div className="mt-6 bg-yellow-400/10 border border-yellow-400/30 rounded-lg p-4">
                  <p className="text-yellow-400 text-xs sm:text-sm">
                    Connect your wallet to trade
                  </p>
                </div>
              )}
            </div>

            {/* Chart Placeholder */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h3 className="text-lg sm:text-xl font-bold text-white mb-4">Price Chart</h3>
              <div className="bg-gray-800 rounded-lg p-6 sm:p-8 text-center">
                <p className="text-gray-400 text-sm sm:text-base">📊 Chart coming soon!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}