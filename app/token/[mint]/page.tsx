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
import { getSolPrice, formatMarketCap } from '@/lib/price-utils';

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
  twitter?: string;
  telegram?: string;
  website?: string;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  totalSupply: number;
  verified?: boolean;
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

  // ✅ ALL useState
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
  const [comments, setComments] = useState<Array<{
    id: string;
    user: string;
    message: string;
    timestamp: number;
  }>>([]);
  const [commentMessage, setCommentMessage] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<{
    verified: boolean;
    pending?: boolean;
    platforms: string[];
  } | null>(null);
  const [solPrice, setSolPrice] = useState(100);

  // ✅ Fetch SOL price
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
        
        const TOTAL_SUPPLY_BASE_UNITS = 1_000_000_000_000_000;
        
        const holders = response
          .map(account => {
            try {
              const amountBaseUnits = Number(account.account.data.readBigUInt64LE(64));
              if (amountBaseUnits === 0) return null;
              
              const owner = new PublicKey(account.account.data.slice(32, 64));
              const actualTokens = amountBaseUnits / 1_000_000;
              const tokensInMillions = actualTokens / 1_000_000;
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

  // WebSocket subscription
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

  // Fetch comments
  useEffect(() => {
    const fetchComments = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(`/api/comments/${token.address}`);
        const data = await response.json();
        setComments(data.comments || []);
      } catch (error) {
        console.error('Error fetching comments:', error);
      }
    };
    
    fetchComments();
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Check verification status
  useEffect(() => {
    const checkVerification = async () => {
      if (!token) return;
      
      try {
        const response = await fetch(`/api/verification/status/${token.address}`);
        const data = await response.json();
        setVerificationStatus(data);
      } catch (error) {
        console.error('Error checking verification:', error);
      }
    };
    
    checkVerification();
  }, [token]);

  // ✅ Calculate market cap
  const calculateMarketCap = () => {
    if (!token) return 0;
    
    if (token.graduated) {
      // Post-graduation: Raydium pool pricing
      // 75 SOL worth for 20% of supply = 375 SOL total market cap
      return 375 * solPrice;
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

  const marketCap = calculateMarketCap();

  // ✅ Functions
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

  const handlePostComment = async () => {
    if (!connected || !publicKey || !commentMessage.trim()) return;
    
    try {
      const response = await fetch(`/api/comments/${token!.address}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: publicKey.toBase58(),
          message: commentMessage.trim(),
        }),
      });
      
      if (response.ok) {
        setCommentMessage('');
        const data = await fetch(`/api/comments/${token!.address}`);
        const commentsData = await data.json();
        setComments(commentsData.comments || []);
      }
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleRequestVerification = async () => {
    if (!connected || !publicKey || !token) return;
    
    setTrading(true);
    try {
      const { registerSocial, generateVerificationCode, SocialPlatform } = await import('../../../lib/social-registry-client');
      const wallet = { publicKey, signTransaction, signAllTransactions };
      
      if (token.twitter) {
        const verificationCode = generateVerificationCode();
        await registerSocial(
          connection,
          wallet,
          token.address,
          SocialPlatform.Twitter,
          token.twitter,
          verificationCode
        );
      }
      
      if (token.telegram) {
        const verificationCode = generateVerificationCode();
        await registerSocial(
          connection,
          wallet,
          token.address,
          SocialPlatform.Telegram,
          token.telegram,
          verificationCode
        );
      }
      
      if (token.website) {
        const verificationCode = generateVerificationCode();
        await registerSocial(
          connection,
          wallet,
          token.address,
          SocialPlatform.Website,
          token.website,
          verificationCode
        );
      }
      
      alert('✅ Verification request submitted! Our team will review and verify your socials within 24-48 hours.');
      
      const response = await fetch(`/api/verification/status/${token.address}`);
      const data = await response.json();
      setVerificationStatus(data);
      
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setTrading(false);
    }
  };

  const handleClaimDevTokens = async () => {
    if (!connected || !publicKey || !token) {
      alert('Please connect wallet!');
      return;
    }
    
    if (token.creator !== publicKey.toBase58()) {
      alert('Only the creator can claim dev tokens!');
      return;
    }
    
    setTrading(true);
    try {
      const { releaseDevTokens } = await import('../../../lib/bonding-curve-client');
      const wallet = { publicKey, signTransaction, signAllTransactions };
      
      const tx = await releaseDevTokens(
        connection,
        wallet,
        token.address
      );
      
      alert(
        `🎉 Success!\n\n` +
        `You claimed 30M dev tokens!\n\n` +
        `TX: https://solscan.io/tx/${tx}?cluster=devnet`
      );
      
      const response = await fetch(`/api/tokens/${mint}`);
      const data = await response.json();
      if (data.token) setToken(data.token);
      
    } catch (error: any) {
      console.error(error);
      alert(`Error: ${error.message || error.toString()}`);
    } finally {
      setTrading(false);
    }
  };

  // Calculate stats
  const last24hTrades = trades.filter(t => t.timestamp > Date.now() / 1000 - 86400);
  const volume24h = last24hTrades.reduce((sum, t) => sum + t.sol, 0);
  
  let priceChange24h = 0;
  if (last24hTrades.length >= 2) {
    const oldPrice = last24hTrades[0].price;
    const newPrice = last24hTrades[last24hTrades.length - 1].price;
    priceChange24h = ((newPrice - oldPrice) / oldPrice) * 100;
  }

  // Loading state
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

  // Not found state
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

            {/* Social Links */}
            {(token.twitter || token.website || token.telegram) && (
              <div className="flex flex-wrap gap-2 mb-6">
                {token.twitter && (
                  <a
                    href={token.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-black/50 hover:bg-black border border-gray-700 hover:border-yellow-400 rounded-lg px-3 py-2 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    <span className="text-white text-sm">X</span>
                  </a>
                )}
                
                {token.telegram && (
                  <a
                    href={token.telegram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-black/50 hover:bg-black border border-gray-700 hover:border-yellow-400 rounded-lg px-3 py-2 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.154.232.17.326.016.094.036.308.02.475z"/>
                    </svg>
                    <span className="text-white text-sm">Telegram</span>
                  </a>
                )}
                
                {token.website && (
                  <a
                    href={token.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 bg-black/50 hover:bg-black border border-gray-700 hover:border-yellow-400 rounded-lg px-3 py-2 transition"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="2" y1="12" x2="22" y2="12"/>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                    </svg>
                    <span className="text-white text-sm">Website</span>
                  </a>
                )}
              </div>
            )}

            {/* Request Verification */}
            {connected && 
             publicKey && 
             token.creator === publicKey.toBase58() && 
             (token.twitter || token.telegram || token.website) && (
              <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl p-6 border-2 border-blue-400 mb-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-2">🔐 Get Verified</h3>
                    <p className="text-gray-300 text-sm mb-4">
                      Prove your social accounts are authentic. Verified accounts get a blue checkmark badge, 
                      helping users identify the official project.
                    </p>
                    
                    {verificationStatus?.verified ? (
                      <div className="bg-green-500/20 border border-green-400 rounded-lg p-4">
                        <p className="text-green-400 font-bold">✅ Verified Accounts:</p>
                        <ul className="text-green-300 text-sm mt-2">
                          {verificationStatus.platforms.map(platform => (
                            <li key={platform}>• {platform}</li>
                          ))}
                        </ul>
                      </div>
                    ) : verificationStatus?.pending ? (
                      <div className="bg-yellow-500/20 border border-yellow-400 rounded-lg p-4">
                        <p className="text-yellow-400 font-bold">⏳ Verification Pending</p>
                        <p className="text-yellow-300 text-sm mt-1">
                          Our team will review your request within 24-48 hours.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={handleRequestVerification}
                        disabled={trading}
                        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white font-bold px-6 py-3 rounded-lg transition"
                      >
                        {trading ? 'Submitting...' : 'Request Verification'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Token Info */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-white">{token.name}</h1>
                {token.verified && (
                  <svg className="w-6 h-6 text-blue-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                  </svg>
                )}
              </div>
              <p className="text-gray-400 text-base sm:text-lg mb-4">${token.symbol}</p>
              {token.description && <p className="text-gray-300 mb-6 text-sm sm:text-base">{token.description}</p>}

              <div className="space-y-3 sm:space-y-4">
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">Market Cap</span>
                  <span className="text-white font-semibold">
                    {formatMarketCap(marketCap)}
                  </span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">SOL Price</span>
                  <span className="text-white font-semibold">${solPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm sm:text-base">
                  <span className="text-gray-400">
                    {token.graduated ? 'Final Raise' : 'SOL Collected'}
                  </span>
                  <span className="text-white font-semibold">
                    {token.graduated ? '81.00 SOL' : `${token.solCollected.toFixed(3)} SOL`}
                  </span>
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

                {/* Progress Section */}
                {token.bondingCurveStatus === 'valid' && (
                  <div className="mt-6">
                    {token.graduated ? (
                      // Graduated - Show final stats
                      <div className="text-center">
                        <div className="mb-4">
                          <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold inline-block">
                            🎓 GRADUATED
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mb-2">Final Raise</p>
                        <p className="text-white text-3xl font-bold mb-4">81.00 SOL</p>
                        <div className="w-full bg-gray-800 rounded-full h-3 mb-2">
                          <div className="bg-gradient-to-r from-green-400 to-green-600 h-3 rounded-full w-full" />
                        </div>
                        <p className="text-green-400 font-bold">100% Complete</p>
                        <p className="text-gray-500 text-sm mt-2">
                          Token graduated to Raydium!
                        </p>
                      </div>
                    ) : (
                      // Active trading - Show progress
                      <div>
                        <div className="flex justify-between text-xs sm:text-sm mb-2">
                          <span className="text-gray-400">Progress to 81 SOL</span>
                          <span className="text-white font-semibold">
                            {Math.min(token.progress, 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
                          <div 
                            className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all" 
                            style={{ width: `${Math.min(token.progress, 100)}%` }} 
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <div>
                            <p className="text-gray-400">Raised</p>
                            <p className="text-white font-bold text-lg">
                              {token.solCollected.toFixed(2)} SOL
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-gray-400">Goal</p>
                            <p className="text-white font-bold text-lg">81.00 SOL</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Statistics */}
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
                    disabled={token.bondingCurveStatus !== 'valid' || !token.isActive}
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

              {token.bondingCurveStatus === 'valid' && token.isActive && (
                <p className="text-gray-400 text-xs sm:text-sm mt-2">
                  {(() => {
                    const buyAmountParsed = parseFloat(buyAmount);
                    if (!buyAmountParsed || buyAmountParsed <= 0) return 'Enter amount';
      
                    const solAfterFee = buyAmountParsed * 0.99; // 1% fee
      
                    // Use CURRENT virtual reserves from token state
                    const currentVirtualSol = token.virtualSolReserves / 1e9; // Convert lamports to SOL
                    const currentVirtualTokens = token.virtualTokenReserves / 1e6; // Convert to tokens
      
                    // Constant product AMM formula: x * y = k
                    const k = currentVirtualSol * currentVirtualTokens;
                    const newVirtualSol = currentVirtualSol + solAfterFee;
                    const newVirtualTokens = k / newVirtualSol;
                    const tokensReceived = currentVirtualTokens - newVirtualTokens;
      
                    return `~${(tokensReceived / 1_000_000).toFixed(2)}M tokens`;
                  })()}
                </p>
              )}
            </div>

            <div>
              <label className="block text-white font-semibold mb-2 text-sm sm:text-base">
                Sell Tokens
              </label>
              <div className="flex gap-2 sm:gap-3">
                <div className="flex-1 relative">
                  <input
                   type="number"
                   step="1"
                   min="1"
                   value={sellAmount}
                   onChange={(e) => setSellAmount(e.target.value)}
                   className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-white outline-none text-sm sm:text-base pr-16"
                   placeholder="Amount"
                   disabled={token.bondingCurveStatus !== 'valid' || !token.isActive}
                  />
                  {userTokenBalance !== null && userTokenBalance > 0 && (
                    <button
                      onClick={() => {
                        // Leave 0.000001 tokens to avoid rent issues
                        const maxSellable = Math.max(0, userTokenBalance - 0.000001);
                        setSellAmount(maxSellable.toString());
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-3 py-1 rounded text-xs transition"
                    >
                      MAX
                    </button>
                  )}
                </div>
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
                          <div className="flex items-center gap-2">
                            <p className="text-white font-semibold">{trade.tokens.toFixed(2)}M tokens</p>
                            {trade.user === token.creator && (
                              <span className="bg-yellow-400/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">
                                DEV
                              </span>
                            )}
                          </div>
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
                        <div className="flex items-center gap-2">
                          <a href={`https://solscan.io/account/${holder.address}?cluster=devnet`} target="_blank" rel="noopener noreferrer" className="text-white hover:text-yellow-400 font-mono text-sm transition">
                            {holder.address.slice(0, 4)}...{holder.address.slice(-4)}
                          </a>
                          {holder.address === token.creator && (
                            <span className="bg-yellow-400/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">
                              DEV
                            </span>
                          )}
                        </div>
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

            {/* Dev Activity */}
            <div className="bg-gray-900 rounded-xl p-4 border-2 border-gray-800">
              <h3 className="text-white font-semibold mb-3">Creator Activity</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Creator</span>
                  <a
                    href={`https://solscan.io/account/${token.creator}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-400 hover:text-yellow-300 font-mono transition"
                  >
                    {token.creator.slice(0, 4)}...{token.creator.slice(-4)}
                  </a>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Dev Trades</span>
                  <span className="text-white font-semibold">
                    {trades.filter(t => t.user === token.creator).length}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Dev Holdings</span>
                  <span className="text-white font-semibold">
                    {(() => {
                      const devHolder = holdersList.find(h => h.address === token.creator);
                      return devHolder ? `${devHolder.balance.toFixed(2)}M (${devHolder.percentage.toFixed(2)}%)` : '0';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* Claim Dev Tokens */}
            {connected && 
             publicKey && 
             token.creator === publicKey.toBase58() && 
             token.graduated && (
              <div className="bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-xl p-6 border-2 border-yellow-400">
                <h3 className="text-2xl font-bold text-white mb-3">🎁 Claim Your Dev Tokens</h3>
                <p className="text-gray-300 mb-4">
                  Your token has graduated! Claim your 30M developer allocation.
                </p>
                <button
                  onClick={handleClaimDevTokens}
                  disabled={trading}
                  className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-4 rounded-lg transition text-lg"
                >
                  {trading ? 'Claiming...' : '🎁 Claim 30M Dev Tokens'}
                </button>
              </div>
            )}

            {/* Comments Section */}
            <div className="bg-gray-900 rounded-xl p-4 sm:p-6 border-2 border-gray-800">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-4">💬 Community Chat</h2>
              
              <div className="space-y-3 max-h-[400px] overflow-y-auto mb-4">
                {comments.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No comments yet. Be the first!</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-black/50 rounded-lg p-3 border border-gray-800">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-yellow-400 font-mono text-sm">
                            {comment.user.slice(0, 4)}...{comment.user.slice(-4)}
                          </span>
                          {comment.user === token.creator && (
                            <span className="bg-yellow-400/20 text-yellow-400 text-xs font-bold px-2 py-0.5 rounded">
                              DEV
                            </span>
                          )}
                        </div>
                        <span className="text-gray-500 text-xs">
                          {new Date(comment.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-white text-sm">{comment.message}</p>
                    </div>
                  ))
                )}
              </div>
              
              {connected ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={commentMessage}
                    onChange={(e) => setCommentMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePostComment()}
                    className="flex-1 bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none text-sm"
                    placeholder="Say something..."
                    maxLength={500}
                  />
                  <button
                    onClick={handlePostComment}
                    disabled={!commentMessage.trim()}
                    className="bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold px-6 py-3 rounded-lg transition"
                  >
                    Send
                  </button>
                </div>
              ) : (
                <p className="text-gray-400 text-center py-4">Connect wallet to comment</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}