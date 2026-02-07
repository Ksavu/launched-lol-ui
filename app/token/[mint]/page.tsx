'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../../../components/Header';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { buyTokens, sellTokens } from '../../../lib/bonding-curve-client';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { TokenWebSocket } from '../../../lib/websocket-client';
import { TradingViewChart } from '../../../components/TradingViewChart';

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

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export default function TokenPage() {
  const params = useParams();
  const mint = params.mint as string;
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [token, setToken] = useState<TokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [buyAmount, setBuyAmount] = useState("0.1");
  const [sellAmount, setSellAmount] = useState("");
  const [userTokenBalance, setUserTokenBalance] = useState<number | null>(null);
  const [trading, setTrading] = useState(false);
  const [chartData, setChartData] = useState<CandleData[]>([]);
  const [ws, setWs] = useState<TokenWebSocket | null>(null);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!token) return;

    const websocket = new TokenWebSocket('https://api.devnet.solana.com');

    websocket.subscribeToToken(token.bondingCurve, (data) => {
      console.log('📡 Real-time update:', data);

      // Update token data
      setToken((prev) =>
        prev
          ? {
              ...prev,
              solCollected: data.solCollected,
              tokensSold: data.tokensSold,
              progress: data.progress,
            }
          : null
      );

      // Add to chart data
      const price = data.solCollected / (data.tokensSold || 1);
      const timestamp = Math.floor(Date.now() / 1000);

      setChartData((prev) => {
        const newData = [...prev];
        const lastCandle = newData[newData.length - 1];

        if (lastCandle && timestamp - lastCandle.time < 60) {
          // Update last candle if within 1 minute
          lastCandle.close = price;
          lastCandle.high = Math.max(lastCandle.high, price);
          lastCandle.low = Math.min(lastCandle.low, price);
        } else {
          // Create new candle
          newData.push({
            time: timestamp,
            open: price,
            high: price,
            low: price,
            close: price,
          });
        }

        return newData.slice(-100); // Keep last 100 candles
      });
    });

    setWs(websocket);

    return () => {
      websocket.unsubscribe();
    };
  }, [token?.bondingCurve]);

  // Fetch user token balance
  useEffect(() => {
    const fetchUserTokenBalance = async () => {
      if (!publicKey || !token || !connection) {
        setUserTokenBalance(null);
        return;
      }

      try {
        const mintPublicKey = new PublicKey(token.address);
        const associatedTokenAccount = getAssociatedTokenAddressSync(
          mintPublicKey,
          publicKey
        );

        const tokenAccountInfo = await connection.getTokenAccountBalance(associatedTokenAccount);
        setUserTokenBalance(tokenAccountInfo.value.uiAmount);
      } catch (error) {
        console.error("Error fetching user token balance:", error);
        setUserTokenBalance(0);
      }
    };

    fetchUserTokenBalance();
    const interval = setInterval(fetchUserTokenBalance, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [publicKey, token, connection]);

  // Fetch initial token data
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await fetch('/api/tokens');
        const data = await response.json();
        const foundToken = data.tokens.find(
          (t: TokenData) => t.address === mint
        );
        setToken(foundToken || null);

        // Initialize chart with mock data
        if (foundToken) {
          const mockChartData: CandleData[] = [];
          let basePrice = foundToken.solCollected / (foundToken.tokensSold || 1);
          const now = Math.floor(Date.now() / 1000);

          for (let i = 50; i > 0; i--) {
            const variation = (Math.random() - 0.5) * basePrice * 0.1;
            const open = basePrice + variation;
            const close = basePrice + (Math.random() - 0.5) * basePrice * 0.1;

            mockChartData.push({
              time: now - i * 60,
              open,
              high: Math.max(open, close) * 1.02,
              low: Math.min(open, close) * 0.98,
              close,
            });

            basePrice = close;
          }

          setChartData(mockChartData);
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [mint]);

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

      alert(
        `✅ Success!\n\nBought tokens!\n\nTX: https://solscan.io/tx/${tx}?cluster=devnet`
      );

      // Refetch token data
      const response = await fetch('/api/tokens');
      const data = await response.json();
      const updatedToken = data.tokens.find(
        (t: TokenData) => t.address === mint
      );
      if (updatedToken) setToken(updatedToken);
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

      alert(
        `✅ Success!\n\nSold tokens!\n\nTX: https://solscan.io/tx/${tx}?cluster=devnet`
      );

      // Refetch token data
      const response = await fetch('/api/tokens');
      const data = await response.json();
      const updatedToken = data.tokens.find(
        (t: TokenData) => t.address === mint
      );
      if (updatedToken) setToken(updatedToken);
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
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                {token.name}
              </h1>
              <p className="text-gray-400 text-base sm:text-lg mb-4">
                ${token.symbol}
              </p>

              {token.description && (
                <p className="text-gray-300 mb-6 text-sm sm:text-base">
                  {token.description}
                </p>
              )}

              {/* Stats */}
              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Market Cap</span>
                  <span className="text-white font-semibold">
                    ${token.marketCap.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">SOL Collected</span>
                  <span className="text-white font-semibold">
                    {token.solCollected.toFixed(3)} SOL
                  </span>
                </div>

                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Tokens Sold</span>
                  <span className="text-white font-semibold">
                    {token.tokensSold >= 1000000
                      ? `${(token.tokensSold / 1000000).toFixed(2)}M`
                      : `${(token.tokensSold / 1000).toFixed(1)}K`}
                  </span>
                </div>

                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={`font-semibold ${
                      token.isActive ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {token.isActive ? '🟢 Active' : '🎓 Graduated'}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-xs sm:text-sm mb-2">
                  <span className="text-gray-400">Progress to 81 SOL</span>
                  <span className="text-white font-semibold">
                    {token.progress.toFixed(2)}%
                  </span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-3">
                  <div
                    className="bg-yellow-400 h-3 rounded-full transition-all"
                    style={{ width: `${token.progress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chart and Actions */}
          <div className="order-1 lg:order-2 space-y-6 lg:space-y-8">
            {/* Chart */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                Price Chart
              </h2>
              <TradingViewChart data={chartData} />
            </div>

            {/* Buy/Sell Actions */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">
                Trade
              </h2>

              {/* Buy Section */}
              <div className="mb-6">
                <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                  Buy Tokens (SOL)
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
                    disabled={trading || !connected || parseFloat(sellAmount) <= 0 || parseFloat(sellAmount) > (userTokenBalance || 0)}
                    className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white font-bold px-4 sm:px-8 py-2 sm:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap"
                  >
                    {trading ? 'Selling...' : 'Sell'}
                  </button>
                </div>
                {userTokenBalance !== null && (
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">
                    You have: {userTokenBalance.toFixed(2)} {token.symbol}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
