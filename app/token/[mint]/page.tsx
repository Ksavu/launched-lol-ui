'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Header } from '../../../components/Header';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import Image from 'next/image';
import { buyTokens, sellTokens } from '../../../lib/bonding-curve-client';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
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
  bondingCurveStatus: 'valid' | 'corrupted' | 'not_found';
  solCollected: number;
  tokensSold: number;
  progress: number;
  isActive: boolean;
  graduated: boolean;
  marketCap: number;
}

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Trade {
  type: 'buy' | 'sell';
  tokens: number;
  sol: number;
  price: number;
  timestamp: number;
  signature: string;
  user: string;
}

interface Holder {
  address: string;
  balance: number;
  percentage: number;
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
  const [trades, setTrades] = useState<Trade[]>([]);
  const [chartInterval, setChartInterval] = useState<60 | 300 | 900 | 3600 | 86400>(60);
  const [holderCount, setHolderCount] = useState<number | null>(null);
  const [holdersList, setHoldersList] = useState<Holder[]>([]);
  const [ws, setWs] = useState<TokenWebSocket | null>(null);

  // Fetch holder count
  useEffect(() => {
    const fetchHolders = async () => {
      if (!token) return;
      
      try {
        const mintPubkey = new PublicKey(token.address);
        const response = await connection.getProgramAccounts(
          TOKEN_PROGRAM_ID,
          {
            filters: [
              { dataSize: 165 },
              {
                memcmp: {
                  offset: 0,
                  bytes: mintPubkey.toBase58(),
                },
              },
            ],
          }
        );
        
        // Filter out zero balances
        const holders = response.filter(account => {
          try {
            const amount = account.account.data.readBigUInt64LE(64);
            return amount > 0;
          } catch {
            return false;
          }
        });
        
        setHolderCount(holders.length);
      } catch (error) {
        console.error('Error fetching holders:', error);
      }
    };
    
    fetchHolders();
  }, [token, connection]);

// Fetch holders list
useEffect(() => {
  const fetchHoldersList = async () => {
    if (!token) return;
    
    try {
      const mintPubkey = new PublicKey(token.address);
      const response = await connection.getProgramAccounts(
        TOKEN_PROGRAM_ID,
        {
          filters: [
            { dataSize: 165 },
            {
              memcmp: {
                offset: 0,
                bytes: mintPubkey.toBase58(),
              },
            },
          ],
        }
      );
      
      // Total supply in base units (1 billion tokens with 6 decimals)
      const TOTAL_SUPPLY_BASE_UNITS = 1_000_000_000_000_000;
      
      // Parse holders with balances
      const holders = response
        .map(account => {
          try {
            const amountBaseUnits = Number(account.account.data.readBigUInt64LE(64));
            if (amountBaseUnits === 0) return null;
            
            const owner = new PublicKey(account.account.data.slice(32, 64));
            
            // Convert base units to millions for display
            const actualTokens = amountBaseUnits / 1_000_000; // Remove 6 decimals
            const tokensInMillions = actualTokens / 1_000_000; // Convert to millions
            
            // Calculate percentage of TOTAL SUPPLY (not just sold)
            const percentage = (amountBaseUnits / TOTAL_SUPPLY_BASE_UNITS) * 100;
            
            return {
              address: owner.toBase58(),
              balance: tokensInMillions,
              percentage: percentage,
            };
          } catch {
            return null;
          }
        })
        .filter(h => h !== null)
        .sort((a, b) => b!.balance - a!.balance)
        .slice(0, 20) as Holder[];
      
      setHoldersList(holders);
    } catch (error) {
      console.error('Error fetching holders list:', error);
    }
  };
  
  fetchHoldersList();
  
  const interval = setInterval(fetchHoldersList, 30000);
  return () => clearInterval(interval);
}, [token, connection]);

  // Rebuild candles when interval changes
  useEffect(() => {
    if (trades.length > 0) {
      const buildCandles = async () => {
        const { buildCandles: build, fillCandleGaps } = await import('../../../lib/candle-builder');
        let candles = build(trades, chartInterval);
        candles = fillCandleGaps(candles, chartInterval);
        setChartData(candles);
      };
      buildCandles();
    }
  }, [chartInterval, trades]);

  // WebSocket subscription for real-time updates
  useEffect(() => {
    if (!token) return;

    const websocket = new TokenWebSocket('https://api.devnet.solana.com');

    websocket.subscribeToToken(token.bondingCurve, (data) => {
      console.log('📡 Real-time update:', data);

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

        const accountInfo = await connection.getAccountInfo(associatedTokenAccount);
        
        if (!accountInfo) {
          setUserTokenBalance(0);
          return;
        }

        const tokenAccountInfo = await connection.getTokenAccountBalance(associatedTokenAccount);
        setUserTokenBalance(tokenAccountInfo.value.uiAmount);
        
      } catch (error: any) {
        if (error.message?.includes('could not find account') || error.toString().includes('Invalid param')) {
          setUserTokenBalance(0);
        } else {
          console.error("Error fetching user token balance:", error);
          setUserTokenBalance(0);
        }
      }
    };

    fetchUserTokenBalance();
    const interval = setInterval(fetchUserTokenBalance, 10000);

    return () => clearInterval(interval);
  }, [publicKey, token, connection]);

  // Fetch initial token data AND trades
  useEffect(() => {
    const fetchTokenData = async () => {
      try {
        const response = await fetch(`/api/tokens/${mint}`);
        if (!response.ok) throw new Error('Token not found');
        const data = await response.json();
        setToken(data.token || null);

        if (data.token) {
          try {
            const tradesResponse = await fetch(`/api/trades/${mint}`);
            const tradesData = await tradesResponse.json();
            
            if (tradesData.trades && tradesData.trades.length > 0) {
              console.log(`📊 Found ${tradesData.trades.length} trades`);
              setTrades(tradesData.trades);
              
              const { buildCandles, fillCandleGaps } = await import('../../../lib/candle-builder');
              
              let candles = buildCandles(tradesData.trades, chartInterval);
              candles = fillCandleGaps(candles, chartInterval);
              
              setChartData(candles);
              console.log(`📈 Built ${candles.length} candles`);
            } else {
              console.log('No trades yet');
              setChartData([]);
              setTrades([]);
            }
          } catch (tradeError) {
            console.error('Error fetching trades:', tradeError);
            setChartData([]);
            setTrades([]);
          }
        }
      } catch (error) {
        console.error('Error fetching token:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTokenData();
  }, [mint, chartInterval]);

  const refreshTradesAndChart = async () => {
    try {
      const tradesResponse = await fetch(`/api/trades/${mint}`);
      const tradesData = await tradesResponse.json();
      
      if (tradesData.trades && tradesData.trades.length > 0) {
        setTrades(tradesData.trades);
        
        const { buildCandles, fillCandleGaps } = await import('../../../lib/candle-builder');
        let candles = buildCandles(tradesData.trades, chartInterval);
        candles = fillCandleGaps(candles, chartInterval);
        setChartData(candles);
      }
    } catch (error) {
      console.error('Error refreshing trades:', error);
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

      alert(
        `✅ Success!\n\nBought tokens!\n\nTX: https://solscan.io/tx/${tx}?cluster=devnet`
      );

      const response = await fetch(`/api/tokens/${mint}`);
      const data = await response.json();
      if (data.token) setToken(data.token);
      
      await refreshTradesAndChart();
      
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

      const response = await fetch(`/api/tokens/${mint}`);
      const data = await response.json();
      if (data.token) setToken(data.token);
      
      await refreshTradesAndChart();
      
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

  const last24hTrades = trades.filter(t => t.timestamp > Date.now() / 1000 - 86400);
  const volume24h = last24hTrades.reduce((sum, t) => sum + t.sol, 0);
  
  let priceChange24h = 0;
  if (last24hTrades.length >= 2) {
    const oldPrice = last24hTrades[0].price;
    const newPrice = last24hTrades[last24hTrades.length - 1].price;
    priceChange24h = ((newPrice - oldPrice) / oldPrice) * 100;
  }

  return (
    <div className="min-h-screen bg-black">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Left Column */}
          <div className="lg:col-span-1 space-y-6">
            <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-gray-900">
              {token.imageUrl ? (
                <Image src={token.imageUrl} alt={token.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl">🪙</div>
              )}
            </div>

            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">{token.name}</h1>
              <p className="text-gray-400 text-base sm:text-lg mb-4">${token.symbol}</p>
              {token.description && <p className="text-gray-300 mb-6 text-sm sm:text-base">{token.description}</p>}

              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Market Cap</span>
                  <span className="text-white font-semibold">
                    ${token.marketCap >= 1000 ? `${(token.marketCap / 1000).toFixed(1)}K` : token.marketCap.toFixed(0)}
                  </span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">SOL Collected</span>
                  <span className="text-white font-semibold">{token.solCollected.toFixed(3)} SOL</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Tokens Sold</span>
                  <span className="text-white font-semibold">{token.tokensSold.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Status</span>
                  <span className={`font-semibold ${
                    token.bondingCurveStatus === 'not_found' ? 'text-gray-400' :
                    token.bondingCurveStatus === 'corrupted' ? 'text-red-400' :
                    token.isActive ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {token.bondingCurveStatus === 'not_found' && '⏳ Not Initialized'}
                    {token.bondingCurveStatus === 'corrupted' && '⚠️ Corrupted'}
                    {token.bondingCurveStatus === 'valid' && token.isActive && '🟢 Active'}
                    {token.bondingCurveStatus === 'valid' && !token.isActive && token.graduated && '🎓 Graduated'}
                    {token.bondingCurveStatus === 'valid' && !token.isActive && !token.graduated && '⏸️ Paused'}
                  </span>
                </div>

                {token.bondingCurveStatus === 'valid' && (
                  <div className="mt-6">
                    <div className="flex justify-between text-xs sm:text-sm mb-2">
                      <span className="text-gray-400">Progress to 81 SOL</span>
                      <span className="text-white font-semibold">{token.progress.toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-gray-800 rounded-full h-3">
                      <div className="bg-yellow-400 h-3 rounded-full transition-all" style={{ width: `${Math.min(token.progress, 100)}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-xl p-4 border-2 border-gray-800">
              <h3 className="text-white font-semibold mb-3">Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">24h Volume</p>
                  <p className="text-white font-semibold">{volume24h.toFixed(2)} SOL</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Holders</p>
                  <p className="text-white font-semibold">{holderCount !== null ? holderCount : '...'}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Trades</p>
                  <p className="text-white font-semibold">{trades.length}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">24h Change</p>
                  <p className={`font-semibold ${priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {last24hTrades.length < 2 ? 'N/A' : `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-8">
            {/* Chart */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Price Chart</h2>
                <div className="flex gap-2">
                  {[
                    { label: '5s', value: 5 },
                    { label: '1m', value: 60 },
                    { label: '5m', value: 300 },
                    { label: '15m', value: 900 },
                    { label: '1h', value: 3600 },
                    { label: '1d', value: 86400 },
                  ].map((interval) => (
                    <button
                      key={interval.value}
                      onClick={() => setChartInterval(interval.value as any)}
                      className={`px-3 py-1 rounded text-sm font-semibold transition ${
                        chartInterval === interval.value ? 'bg-yellow-400 text-black' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {interval.label}
                    </button>
                  ))}
                </div>
              </div>
              <TradingViewChart data={chartData} />
            </div>

            {/* Trading */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Trade</h2>
              <div className="mb-6">
                <label className="block text-white font-semibold mb-2 text-sm sm:text-base">Buy Tokens (SOL)</label>
                <div className="flex gap-2 sm:gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    className="flex-1 bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white outline-none text-sm sm:text-base"
                    placeholder="SOL"
                    disabled={token.bondingCurveStatus !== 'valid'}
                  />
                  <button
                    onClick={handleBuy}
                    disabled={trading || !connected || token.bondingCurveStatus !== 'valid' || !token.isActive}
                    className={`font-bold px-4 sm:px-8 py-2 sm:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap ${
                      token.bondingCurveStatus === 'valid' && token.isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-600 cursor-not-allowed'
                    } text-white`}
                  >
                    {token.bondingCurveStatus !== 'valid' ? 'Not Available' : !token.isActive ? 'Trading Paused' : trading ? 'Buying...' : 'Buy'}
                  </button>
                </div>
                {token.bondingCurveStatus === 'valid' && (
                  <p className="text-gray-400 text-xs sm:text-sm mt-2">
                    {(() => {
                      const solAfterFee = parseFloat(buyAmount) * 0.99;
                      const VIRTUAL_SOL = 30;
                      const VIRTUAL_TOKENS = 1040000000;
                      const k = VIRTUAL_SOL * VIRTUAL_TOKENS;
                      const newVirtualSol = VIRTUAL_SOL + solAfterFee;
                      const newVirtualTokens = k / newVirtualSol;
                      const tokensReceived = VIRTUAL_TOKENS - newVirtualTokens;
                      return `~${(tokensReceived / 1000000).toFixed(2)}M tokens`;
                    })()}
                  </p>
                )}
              </div>

<div>
  <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
    Sell Tokens
  </label>
  <div className="flex gap-2 sm:gap-3">
    <input
      type="number"
      step="1"
      min="1"
      value={sellAmount}
      onChange={(e) => setSellAmount(e.target.value)}
      className="flex-1 bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white outline-none text-sm sm:text-base"
      placeholder="Amount"
      disabled={token.bondingCurveStatus !== 'valid'}
    />
    <button
      onClick={handleSell}
      disabled={
        trading || 
        !connected || 
        token.bondingCurveStatus !== 'valid' ||
        !token.isActive ||
        parseFloat(sellAmount) <= 0 || 
        parseFloat(sellAmount) > (userTokenBalance || 0)
      }
      className={`font-bold px-4 sm:px-8 py-2 sm:py-3 rounded-lg transition text-sm sm:text-base whitespace-nowrap ${
        token.bondingCurveStatus === 'valid' && token.isActive
          ? 'bg-red-500 hover:bg-red-600'
          : 'bg-gray-600 cursor-not-allowed'
      } text-white`}
    >
      {token.bondingCurveStatus !== 'valid' 
        ? 'Not Available' 
        : !token.isActive
        ? 'Trading Paused'
        : trading 
          ? 'Selling...' 
          : 'Sell'}
    </button>
  </div>
  {userTokenBalance !== null && token.bondingCurveStatus === 'valid' && (
    <p className="text-gray-400 text-xs sm:text-sm mt-2">
      Balance: {userTokenBalance.toLocaleString()} {token.symbol}
    </p>
  )}
</div>
            </div>

            {/* Transactions */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">Recent Transactions</h2>
              {trades.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {trades.slice(-20).reverse().map((trade, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gray-800 hover:border-gray-700 transition">
                      <div className="flex items-center gap-3">
                        <div className={`px-2 py-1 rounded text-xs font-bold ${trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.type.toUpperCase()}
                        </div>
                        <div>
                          <p className="text-white font-semibold">{trade.tokens.toFixed(2)}M tokens</p>
                          <p className="text-gray-400 text-sm">{trade.sol.toFixed(3)} SOL</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <a href={`https://solscan.io/tx/${trade.signature}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-400 text-sm transition block">
                          View Tx →
                        </a>
                        <p className="text-gray-500 text-xs mt-1">{new Date(trade.timestamp * 1000).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Holders List */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl sm:text-2xl font-bold text-white">Top Holders</h2>
                <span className="text-gray-400 text-sm">{holderCount !== null ? `${holderCount} holders` : 'Loading...'}</span>
              </div>
              {holdersList.length === 0 ? (
                <p className="text-gray-400 text-center py-8">Loading holders...</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {holdersList.map((holder, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-black/50 rounded-lg border border-gray-800">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-mono text-sm">#{idx + 1}</span>
                        <a href={`https://solscan.io/account/${holder.address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-400 font-mono text-sm transition">
                          {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                        </a>
                      </div>
                      <div className="text-right">
                        <p className="text-white font-semibold">{holder.balance.toFixed(2)}M</p>
                        <p className="text-gray-400 text-xs">{holder.percentage.toFixed(2)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}