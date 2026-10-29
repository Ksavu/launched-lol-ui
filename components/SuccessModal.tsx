'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface SuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokenName: string;
  tokenSymbol: string;
  mintAddress: string;
  imageUrl?: string;
}

export function SuccessModal({ 
  isOpen, 
  onClose, 
  tokenName, 
  tokenSymbol, 
  mintAddress,
  imageUrl 
}: SuccessModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleViewToken = () => {
    router.push(`/token/${mintAddress}`);
  };

  const handleCreateAnother = () => {
    onClose();
    window.location.reload(); // Refresh to reset form
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-2 border-brand rounded-2xl max-w-md w-full p-8 relative">
        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full mb-4">
            <span className="text-5xl">🎉</span>
          </div>
          <h2 className="text-3xl font-bold text-ink mb-2">Token Created!</h2>
          <p className="text-muted">Your token is now live on Solana</p>
        </div>

        {/* Token Info */}
        <div className="bg-white/70 rounded-xl p-6 mb-6 border border-line">
          <div className="flex items-center gap-4 mb-4">
            {imageUrl ? (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden">
                <Image src={imageUrl} alt={tokenName} fill className="object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-panel rounded-lg flex items-center justify-center text-3xl">
                🪙
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-ink">{tokenName}</h3>
              <p className="text-muted">${tokenSymbol}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Mint Address</span>
              
                href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:text-brand font-mono text-xs"
              <a>
                {mintAddress.slice(0, 8)}...{mintAddress.slice(-8)}
              </a>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleViewToken}
            className="w-full bg-brand hover:bg-brand text-white font-bold py-4 rounded-xl transition"
          >
            🚀 View Token Page
          </button>
          
          <button
            onClick={handleCreateAnother}
            className="w-full bg-panel hover:bg-[#e7dbf6] text-ink font-semibold py-4 rounded-xl transition"
          >
            ➕ Create Another Token
          </button>

          
            href={`https://solscan.io/token/${mintAddress}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center text-muted hover:text-ink py-2 text-sm transition"
          <a>
            View on Solscan →
          </a>
        </div>
      </div>
    </div>
  );
}