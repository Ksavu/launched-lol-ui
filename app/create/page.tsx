'use client';

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { initializeBondingCurve } from '../../lib/bonding-curve-client';
import { useState } from 'react';
import { Header } from '../../components/Header';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import   Image from 'next/image';
import { SuccessModal } from '../../components/SuccessModal';

export default function CreateToken() {
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [createdToken, setCreatedToken] = useState<{
  name: string;
  symbol: string;
  mint: string;
  imageUrl: string;
} | null>(null);

  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    tier: 'free' as 'free' | 'premium',
    category: 'meme' as 'meme' | 'ai' | 'gaming' | 'defi' | 'nft' | 'other',
    antiBotEnabled: false,
    launchDelay: 60,
    devBuyAmount: 0,
  });

  // Reset form
      const resetForm = () => {
  setFormData({
    name: '',
    symbol: '',
    description: '',
    tier: 'free',
    category: 'meme',
    antiBotEnabled: false,
    launchDelay: 60,
    devBuyAmount: 0,
  });
  setImageFile(null);
  setImagePreview('');
};
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connected || !publicKey) {
      alert('Please connect your wallet first!');
      return;
    }

    if (!imageFile) {
      alert('Please upload an image!');
      return;
    }

    setIsCreating(true);
    
    try {
      // Step 1: Upload image to IPFS
      console.log('📤 Uploading image to IPFS...');
      const imageFormData = new FormData();
      imageFormData.append('file', imageFile);
      
      const imageResponse = await fetch('/api/upload-image', {
        method: 'POST',
        body: imageFormData,
      });
      
      if (!imageResponse.ok) {
        throw new Error('Failed to upload image');
      }
      
      const { imageUrl } = await imageResponse.json();
      console.log('✅ Image uploaded:', imageUrl);
      
      // Step 2: Upload metadata to IPFS
      console.log('📤 Uploading metadata to IPFS...');
      const metadataResponse = await fetch('/api/upload-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description,
          imageUrl,
        }),
      });
      
      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata');
      }
      
      const { metadataUrl } = await metadataResponse.json();
      console.log('✅ Metadata uploaded:', metadataUrl);
      
      // Step 3: Create token on blockchain
      console.log('⛓️ Creating token on Solana...');
      
      const { createTokenManual } = await import('../../lib/token-creation');
      
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };
      
      const tokenResult = await createTokenManual(
        connection,
        wallet,
        {
          name: formData.name,
          symbol: formData.symbol,
          uri: metadataUrl,
          tier: formData.tier.toLowerCase() as 'free' | 'premium',
          category: formData.category.toLowerCase() as 'meme' | 'ai' | 'gaming' | 'defi' | 'nft' | 'other',
          launchDelay: formData.launchDelay,
          antiBotEnabled: formData.antiBotEnabled,
        }
      );
      
      console.log('✅ Token created on-chain!', tokenResult);
      
// After token creation, before initializing bonding curve
console.log('🔍 Verifying mint account...');
const mintAccount = await connection.getAccountInfo(new PublicKey(tokenResult.mint));
if (!mintAccount) {
  throw new Error('Mint account not found immediately after creation!');
}
console.log('✅ Mint account exists');
console.log('   Owner:', mintAccount.owner.toBase58());
console.log('   Expected owner:', TOKEN_PROGRAM_ID.toBase58());

// Verify it's owned by Token Program
if (!mintAccount.owner.equals(TOKEN_PROGRAM_ID)) {
  throw new Error(`Mint owned by wrong program: ${mintAccount.owner.toBase58()}`);
}

// Step 4: Initialize bonding curve
console.log('🔄 Initializing bonding curve...');

const { initializeBondingCurve } = await import('../../lib/bonding-curve-client');
const treasuryWallet = 'GtcpcvS3k24MA3Yhs6bAd1spkdjYmx82KqRxSk6pPWhE';

// DECLARE THE VARIABLE OUTSIDE THE TRY BLOCK
let bondingCurveTx = null;
let bondingCurveAddress = null;

try {
  const bondingCurveResult = await initializeBondingCurve(
    connection,
    wallet,
    tokenResult.mint,
    treasuryWallet,
    formData.tier === 'premium',      // isPremium
    formData.launchDelay,              // launchDelay (0-300)
    formData.antiBotEnabled            // enableAntiBot
  );
  
  // Handle the new return format
  if (bondingCurveResult.success) {
    bondingCurveAddress = bondingCurveResult.bondingCurve;
    
    if (bondingCurveResult.existing) {
      console.log('♻️ Using existing bonding curve:', bondingCurveAddress);
      bondingCurveTx = 'existing-account';
    } else {
      console.log('✅ Bonding curve initialized! TX:', bondingCurveResult.txid);
      bondingCurveTx = bondingCurveResult.txid;
    }
  } else {
    throw new Error('Bonding curve initialization failed');
  }
  
} catch (bondingError: any) {
  console.error('❌ Bonding curve error:', bondingError);
  
  // Check for our specific error code
  if (bondingError.code === 'ACCOUNT_DID_NOT_DESERIALIZE' || 
      bondingError.customErrorCode === 3003 ||
      bondingError.message?.includes('already exists with wrong data')) {
    
    alert(
      `⚠️ Token was created but bonding curve initialization failed.\n\n` +
      `This mint address already has a bonding curve with incorrect data.\n` +
      `This usually happens when a previous creation attempt failed.\n\n` +
      `Please try creating a new token with a different name/symbol.\n\n` +
      `Token Mint: ${tokenResult.mint}\n` +
      `Transaction: https://solscan.io/tx/${tokenResult.signature}?cluster=devnet`
    );
    
    bondingCurveTx = 'failed';
    
  } else {
    throw bondingError;
  }
}

// Step 5: Optional dev buy (during countdown if delay > 0)
let buyTx = null;
// ✅ FIX: Only attempt dev buy if bonding curve didn't fail - REMOVE THE DUPLICATE CONDITION
if (formData.devBuyAmount > 0 && bondingCurveTx && bondingCurveTx !== 'failed') {
  console.log('💰 Dev buying initial supply:', formData.devBuyAmount, 'SOL');
  
  try {
    // Use devBuy if there's a launch delay, otherwise use regular buyTokens
    if (formData.launchDelay > 0) {
      const { devBuy } = await import('../../lib/bonding-curve-client');
      
      buyTx = await devBuy(
        connection,
        wallet,
        tokenResult.mint,
        formData.devBuyAmount
      );
    } else {
      const { buyTokens } = await import('../../lib/bonding-curve-client');
      
      buyTx = await buyTokens(
        connection,
        wallet,
        tokenResult.mint,
        formData.devBuyAmount
      );
    }
    
    console.log('✅ Dev bought tokens!', buyTx);
  } catch (buyError) {
    console.error('❌ Dev buy failed:', buyError);
    // Don't throw - dev buy is optional
    alert(`⚠️ Token created but dev buy failed: ${buyError instanceof Error ? buyError.message : 'Unknown error'}`);
  }
}

// Success message
let message = '';
if (bondingCurveTx === 'failed') {
  message = `⚠️ TOKEN CREATED BUT BONDING CURVE FAILED\n\n` +
    `Token: ${tokenResult.mint}\n\n` +
    `Token Creation: https://solscan.io/tx/${tokenResult.signature}?cluster=devnet\n\n` +
    `The bonding curve could not be initialized because an account already exists.\n` +
    `Please create a new token with a different name/symbol.`;
} else {
  const bondingLink = bondingCurveTx === 'existing-account' 
    ? 'Using existing bonding curve account' 
    : `https://solscan.io/tx/${bondingCurveTx}?cluster=devnet`;
  
  message = buyTx 
    ? `🎉 SUCCESS!\n\nToken: ${tokenResult.mint}\n\n` +
      `Token Creation: https://solscan.io/tx/${tokenResult.signature}?cluster=devnet\n\n` +
      `Bonding Curve: ${bondingLink}\n\n` +
      `Dev Buy: https://solscan.io/tx/${buyTx}?cluster=devnet\n\n` +
      `Your token is now tradeable!`
    : `🎉 SUCCESS!\n\nToken: ${tokenResult.mint}\n\n` +
      `Token Creation: https://solscan.io/tx/${tokenResult.signature}?cluster=devnet\n\n` +
      `Bonding Curve: ${bondingLink}\n\n` +
      `Your token is now tradeable!`;
}

alert(message);

// Reset form on success
resetForm();

} catch (error) {  // This catch should be for the main try block
  console.error('❌ Error creating token:', error);
  alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
} finally {
  setIsCreating(false);
}
};

  return (
  <div className="min-h-screen bg-black">
    <Header />
    
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Create Your Token
        </h1>
        <p className="text-gray-400">
          Launch your token on Solana with a fair bonding curve
        </p>
</div>

      {/* Success Modal */}
      {createdToken && (
        <SuccessModal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setCreatedToken(null);
          }}
          tokenName={createdToken.name}
          tokenSymbol={createdToken.symbol}
          mintAddress={createdToken.mint}
          imageUrl={createdToken.imageUrl}
        />
      )}

      </div>

      {!connected ? (
        <div className="bg-gray-900 rounded-xl p-12 text-center border-2 border-yellow-400/20">
          <h2 className="text-2xl font-bold text-white mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-gray-400">
            Please connect your Solana wallet to create a token
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-8 border-2 border-yellow-400/20">
          {/* Token Image */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Token Image
            </label>
            <div className="flex items-center space-x-4">
              {imagePreview && (
                <div className="w-24 h-24 relative rounded-lg overflow-hidden border-2 border-yellow-400">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <label className="cursor-pointer bg-yellow-400 hover:bg-yellow-500 text-black font-bold px-6 py-3 rounded-lg transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                Choose Image
              </label>
            </div>
            <p className="text-sm text-gray-400 mt-2">Recommended: 512x512px, PNG or JPG</p>
          </div>

          {/* Token Name */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Token Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={32}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
              placeholder="e.g., Moon Token"
            />
            <p className="text-sm text-gray-400 mt-1">{formData.name.length}/32 characters</p>
          </div>

          {/* Token Symbol */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Token Symbol <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={formData.symbol}
              onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
              className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
              placeholder="e.g., MOON"
            />
            <p className="text-sm text-gray-400 mt-1">{formData.symbol.length}/10 characters</p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              maxLength={500}
              className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
              placeholder="Describe your token..."
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
            >
              <option value="meme">🎭 Meme</option>
              <option value="ai">🤖 AI</option>
              <option value="gaming">🎮 Gaming</option>
              <option value="defi">💰 DeFi</option>
              <option value="nft">🖼️ NFT</option>
              <option value="other">📦 Other</option>
            </select>
          </div>

          {/* Tier Selection */}
          <div className="mb-6">
            <label className="block text-white font-semibold mb-3">
              Launch Tier
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Free Tier */}
              <div
                onClick={() => setFormData({...formData, tier: 'free', antiBotEnabled: false})}
                className={`cursor-pointer p-6 rounded-xl border-2 transition ${
                  formData.tier === 'free'
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white">Free</h3>
                  <span className="text-2xl font-bold text-yellow-400">0.01 SOL</span>
                </div>
                <p className="text-sm text-gray-400">~$2</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-400">
                  <li>✓ Basic listing</li>
                  <li>✓ Bonding curve</li>
                  <li>✗ Featured placement</li>
                  <li>✗ Anti-bot protection</li>
                </ul>
              </div>

              {/* Premium Tier */}
              <div
                onClick={() => setFormData({...formData, tier: 'premium'})}
                className={`cursor-pointer p-6 rounded-xl border-2 transition ${
                  formData.tier === 'premium'
                    ? 'border-yellow-400 bg-yellow-400/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-white">Premium</h3>
                  <span className="text-2xl font-bold text-yellow-400">0.5 SOL</span>
                </div>
                <p className="text-sm text-gray-400">~$94</p>
                <ul className="mt-4 space-y-2 text-sm text-gray-400">
                  <li>✓ Featured placement</li>
                  <li>✓ Category badge</li>
                  <li>✓ Premium badge</li>
                  <li>✓ Optional anti-bot</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Anti-Bot Toggle (Premium Only) */}
          {formData.tier === 'premium' && (
            <div className="mb-6 bg-black/50 p-6 rounded-xl border border-yellow-400/30">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="text-white font-semibold mb-1">Anti-Bot Protection</h3>
                  <p className="text-sm text-gray-400">
                    Max 2% buy in first 5 minutes to prevent sniping
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.antiBotEnabled}
                  onChange={(e) => setFormData({...formData, antiBotEnabled: e.target.checked})}
                  className="w-6 h-6"
                />
              </label>
            </div>
          )}

          {/* Launch Delay */}
          <div className="mb-8">
            <label className="block text-white font-semibold mb-2">
              Launch Countdown: {formData.launchDelay} seconds
            </label>
            <input
              type="range"
              min="0"
              max="300"
              step="30"
              value={formData.launchDelay}
              onChange={(e) => setFormData({...formData, launchDelay: parseInt(e.target.value)})}
              className="w-full"
            />
            <div className="flex justify-between text-sm text-gray-400 mt-1">
              <span>Instant</span>
              <span>5 minutes</span>
            </div>
          </div>

          {/* Dev Buy Option */}
          <div className="mb-8 bg-black/50 p-6 rounded-xl border border-yellow-400/30">
            <h3 className="text-white font-semibold mb-2">🎯 Optional: Buy Initial Supply</h3>
            <p className="text-sm text-gray-400 mb-4">
              Buy tokens immediately after creation. Shows commitment and starts your position.
            </p>
            
            <label className="block text-white font-semibold mb-2">
              Buy Amount (SOL)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.devBuyAmount}
              onChange={(e) => setFormData({...formData, devBuyAmount: parseFloat(e.target.value) || 0})}
              className="w-full bg-black border-2 border-gray-700 focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none"
              placeholder="0 (no buy) or 0.1-5.0 SOL"
            />
            
            {formData.devBuyAmount > 0 && (
              <div className="mt-3 p-3 bg-yellow-400/10 rounded-lg">
                {(() => {
                  const solAfterFee = formData.devBuyAmount * 0.99;
      
                  // Virtual AMM constants
                  const VIRTUAL_SOL = 30;
                  const VIRTUAL_TOKENS = 1040000000;
                  const k = VIRTUAL_SOL * VIRTUAL_TOKENS;
      
                  // Bonding curve calculation
                  const newVirtualSol = VIRTUAL_SOL + solAfterFee;
                  const newVirtualTokens = k / newVirtualSol;
                  const tokensReceived = VIRTUAL_TOKENS - newVirtualTokens;
                  const percentOfSupply = (tokensReceived / 1000000000) * 100;
      
                  return (
                    <p className="text-sm text-yellow-400">
                      📊 You'll receive approximately {tokensReceived >= 1000000 
                        ? `${(tokensReceived / 1000000).toFixed(2)}M` 
                        : `${(tokensReceived / 1000).toFixed(1)}K`} tokens (~{percentOfSupply.toFixed(2)}%)
                    </p>
                  );
                })()}
                <p className="text-xs text-gray-400 mt-1">
                  Total cost: {(parseFloat(formData.tier === 'free' ? '0.01' : '0.5') + formData.devBuyAmount).toFixed(2)} SOL
                </p>
              </div>
            )}
            
            <p className="text-xs text-gray-500 mt-3">
              💡 Tip: 0.5-1 SOL buy shows strong commitment to your token
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating || !imageFile}
            className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-4 rounded-lg transition text-lg"
          >
            {isCreating 
              ? 'Creating...' 
              : `Create Token (${(parseFloat(formData.tier === 'free' ? '0.01' : '0.5') + formData.devBuyAmount).toFixed(2)} SOL)`
            }
          </button>

          {!imageFile && (
            <p className="text-center text-red-400 text-sm mt-2">
              Please upload an image to continue
            </p>
          )}
        </form>
      )} 
    </div>
);
} 