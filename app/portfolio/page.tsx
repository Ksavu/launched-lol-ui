'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { Header } from '../../components/Header';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import Link from 'next/link';
import Image from 'next/image';

interface TokenHolding {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  balance: number;
  marketCap: number;
  solCollected: number;
  verified: boolean;
}

export default function Portfolio() {
  const { publicKey, connected } = useWallet();
  const { connection } = useConnection();
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const fetchHoldings = async () => {
      if (!publicKey) {
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching portfolio for:', publicKey.toBase58());

        // Get all token accounts for user
        const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, {
          filters: [
            { dataSize: 165 },
            { memcmp: { offset: 32, bytes: publicKey.toBase58() } }
          ]
        });

        console.log(`Found ${accounts.length} token accounts`);

        const tokens = await Promise.all(
          accounts.map(async ({ account }) => {
            try {
              const mint = new PublicKey(account.data.slice(0, 32));
              const amountBaseUnits = Number(account.data.readBigUInt64LE(64));
              
              if (amountBaseUnits === 0) return null;

              // Convert to millions for display
              const actualTokens = amountBaseUnits / 1_000_000; // Remove decimals
              const balance = actualTokens / 1_000_000; // Convert to millions

              // Fetch token metadata
              const response = await fetch(`/api/tokens/${mint.toBase58()}`);
              
              if (!response.ok) return null;
              
              const data = await response.json();
              
              if (!data.token) return null;

              return {
                ...data.token,
                balance,
              };
            } catch (error) {
              console.error('Error fetching token:', error);
              return null;
            }
          })
        );

        const validTokens = tokens.filter((t): t is TokenHolding => t !== null);
        
        // Sort by market cap
        validTokens.sort((a, b) => b.marketCap - a.marketCap);
        
        setHoldings(validTokens);

        // Calculate total portfolio value
        const total = validTokens.reduce((sum, token) => {
          // Calculate value: (balance / total supply) * market cap
          const totalSupply = 1000; // 1000M total supply
          const percentage = token.balance / totalSupply;
          const value = token.marketCap * percentage;
          return sum + value;
        }, 0);

        setTotalValue(total);

      } catch (error) {
        console.error('Error fetching holdings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHoldings();
  }, [publicKey, connection]);

  if (!connected) {
    return (
      <div className="min-h-screen bg-page">
        <Header />
        <div className="max-w-7xl mx-auto px-4 py-20 text-center">
          <div className="bg-white rounded-xl p-12 border-2 border-line">
            <div className="text-6xl mb-4">💼</div>
            <h1 className="text-4xl font-bold text-ink mb-4">Your Portfolio</h1>
            <p className="text-muted text-lg mb-6">
              Connect your wallet to view your token holdings
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-page">
      <Header />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-ink mb-2">Your Portfolio</h1>
          <p className="text-muted">
             Wallet: <span className="text-brand font-mono">{publicKey!.toBase58().slice(0, 8)}...{publicKey!.toBase58().slice(-8)}</span>
          </p>
        </div>

        {/* Portfolio Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-[#4a128f] to-brand rounded-xl p-6">
            <p className="text-white/80 text-sm mb-2">Total Value</p>
            <p className="text-4xl font-bold text-white">
              ${totalValue >= 1000 ? `${(totalValue / 1000).toFixed(2)}K` : totalValue.toFixed(2)}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border-2 border-line">
            <p className="text-muted text-sm mb-2">Tokens Held</p>
            <p className="text-4xl font-bold text-ink">{holdings.length}</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 border-2 border-line">
            <p className="text-muted text-sm mb-2">Verified Tokens</p>
            <p className="text-4xl font-bold text-brand">
              {holdings.filter(t => t.verified).length}
            </p>
          </div>
        </div>

        {/* Holdings List */}
        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            <p className="text-ink mt-4">Loading portfolio...</p>
          </div>
        ) : holdings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-line">
            <div className="text-6xl mb-4">📭</div>
            <p className="text-muted text-lg mb-4">No tokens found in your wallet</p>
            <Link
              href="/explore"
              className="inline-block bg-brand hover:bg-brand text-white font-bold px-6 py-3 rounded-lg transition"
            >
              Explore Tokens
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {holdings.map((token) => (
              <Link
                key={token.address}
                href={`/token/${token.address}`}
                className="bg-white rounded-xl p-6 border-2 border-line hover:border-brand transition group"
              >
                {/* Token Header */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    {token.imageUrl ? (
                      <Image
                        src={token.imageUrl}
                        alt={token.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-panel flex items-center justify-center text-2xl">
                        🪙
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-ink font-bold text-lg truncate">
                        {token.name}
                      </h3>
                      {token.verified && (
                        <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                      )}
                    </div>
                    <p className="text-muted text-sm">${token.symbol}</p>
                  </div>
                </div>

                {/* Token Stats */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Your Balance</span>
                    <span className="text-ink font-semibold">
                      {token.balance.toFixed(2)}M
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">Market Cap</span>
                    <span className="text-ink font-semibold">
                      ${token.marketCap >= 1000 
                        ? `${(token.marketCap / 1000).toFixed(1)}K` 
                        : token.marketCap.toFixed(0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted">SOL Collected</span>
                    <span className="text-ink font-semibold">
                      {token.solCollected.toFixed(2)} SOL
                    </span>
                  </div>
                  
                  {/* Estimated Value */}
                  <div className="pt-2 mt-2 border-t border-line">
                    <div className="flex justify-between">
                      <span className="text-muted text-sm">Est. Value</span>
                      <span className="text-brand font-bold">
                        ${(() => {
                          const totalSupply = 1000;
                          const percentage = token.balance / totalSupply;
                          const value = token.marketCap * percentage;
                          return value >= 1000 
                            ? `${(value / 1000).toFixed(2)}K` 
                            : value.toFixed(2);
                        })()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* View Token Link */}
                <div className="mt-4 pt-4 border-t border-line">
                  <span className="text-brand group-hover:text-brand text-sm font-semibold flex items-center justify-between">
                    View Token
                    <svg className="w-4 h-4 transform group-hover:translate-x-1 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}