'use client';

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { initializeBondingCurve } from '../../lib/bonding-curve-client';
import { useState, useEffect, useRef } from 'react';
import { Header } from '../../components/Header';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { startVanityGrind, VANITY_SUFFIX, VanityHandle, VanityResult } from '../../lib/vanity-address';
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
    twitter: '',
    telegram: '',
    website: '',
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
    twitter: '',
    telegram: '',
    website: '',
  });
  setImageFile(null);
  setImagePreview('');
};
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const [vanityChoice, setVanityChoice] = useState<'vanity' | 'random'>('vanity');
  const [grindAttempts, setGrindAttempts] = useState(0);
  const [grinding, setGrinding] = useState(false);
  const [vanityReady, setVanityReady] = useState(false);
  const vanityRef = useRef<VanityHandle | null>(null);

  const needsVanity = formData.tier === 'free' || vanityChoice === 'vanity';

  // Start grinding in the background as soon as the page needs a ...LoL address
  useEffect(() => {
    if (needsVanity && !vanityRef.current) {
      setGrindAttempts(0);
      const h = startVanityGrind(VANITY_SUFFIX, setGrindAttempts);
      vanityRef.current = h;
      h.promise.then((r) => { if (r && vanityRef.current === h) setVanityReady(true); });
    }
    if (!needsVanity && vanityRef.current) {
      vanityRef.current.cancel();
      vanityRef.current = null;
      setVanityReady(false);
    }
  }, [needsVanity]);
  useEffect(() => () => { vanityRef.current?.cancel(); }, []);

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

    // Validate premium socials
  if (formData.tier === 'premium') {
    if (!formData.twitter || !formData.telegram) {
      alert('Premium tokens require X (Twitter) and Telegram links!');
      return;
    }
    
    // Validate URL format
    if (!formData.twitter.startsWith('https://x.com/') && !formData.twitter.startsWith('https://twitter.com/')) {
      alert('Please enter a valid X (Twitter) URL starting with https://x.com/ or https://twitter.com/');
      return;
    }
    
    if (!formData.telegram.startsWith('https://t.me/')) {
      alert('Please enter a valid Telegram URL starting with https://t.me/');
      return;
    }
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
          twitter: formData.twitter || undefined,
          telegram: formData.telegram || undefined,
          website: formData.website || undefined,
        }),
      });
      
      if (!metadataResponse.ok) {
        throw new Error('Failed to upload metadata');
      }
      
      const { metadataUrl } = await metadataResponse.json();
      console.log('✅ Metadata uploaded:', metadataUrl);
      
      // Step 2.5: Mint address (free = forced ...LoL, premium = choice)
      let mintKeypair: Keypair | undefined;
      if (formData.tier === 'free' || vanityChoice === 'vanity') {
        setGrinding(true);
        if (!vanityRef.current) vanityRef.current = startVanityGrind(VANITY_SUFFIX, setGrindAttempts);
        const vanity: VanityResult | null = await vanityRef.current.promise;
        vanityRef.current = null; // next token grinds a fresh address
        setVanityReady(false);
        setGrinding(false);
        if (!vanity) throw new Error('Could not generate a ...LoL address, please try again');
        mintKeypair = vanity.keypair;
      }

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
          mintKeypair,
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
  <div className="min-h-screen bg-page">
    <Header />
    
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-bold text-ink mb-4">
          Create Your Token
        </h1>
        <p className="text-muted">
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


      {!connected ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-brand/25">
          <h2 className="text-2xl font-bold text-ink mb-4">
            Connect Your Wallet
          </h2>
          <p className="text-muted">
            Please connect your Solana wallet to create a token
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-8 border-2 border-brand/25">
          {/* Token Image */}
          <div className="mb-6">
            <label className="block text-ink font-semibold mb-2">
              Token Image
            </label>
            <div className="flex items-center space-x-4">
              {imagePreview && (
                <div className="w-24 h-24 relative rounded-lg overflow-hidden border-2 border-brand">
                  <Image src={imagePreview} alt="Preview" fill className="object-cover" />
                </div>
              )}
              <label className="cursor-pointer bg-brand hover:bg-brand text-white font-bold px-6 py-3 rounded-lg transition">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                Choose Image
              </label>
            </div>
            <p className="text-sm text-muted mt-2">Recommended: 512x512px, PNG or JPG</p>
          </div>

          {/* Token Name */}
          <div className="mb-6">
            <label className="block text-ink font-semibold mb-2">
              Token Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={32}
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full bg-white border-2 border-line focus:border-brand rounded-lg px-4 py-3 text-ink outline-none"
              placeholder="e.g., Moon Token"
            />
            <p className="text-sm text-muted mt-1">{formData.name.length}/32 characters</p>
          </div>

          {/* Token Symbol */}
          <div className="mb-6">
            <label className="block text-ink font-semibold mb-2">
              Token Symbol <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={10}
              value={formData.symbol}
              onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
              className="w-full bg-white border-2 border-line focus:border-brand rounded-lg px-4 py-3 text-ink outline-none"
              placeholder="e.g., MOON"
            />
            <p className="text-sm text-muted mt-1">{formData.symbol.length}/10 characters</p>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label className="block text-ink font-semibold mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={4}
              maxLength={500}
              className="w-full bg-white border-2 border-line focus:border-brand rounded-lg px-4 py-3 text-ink outline-none"
              placeholder="Describe your token..."
            />
          </div>

          {/* Social Links */}
<div className="mb-6">
  <label className="block text-ink font-semibold mb-3">
    Social Links 
    {formData.tier === 'premium' ? (
      <span className="text-rose-500 text-sm font-normal"> (Required for Premium)</span>
    ) : (
      <span className="text-muted text-sm font-normal"> (Optional)</span>
    )}
  </label>
  
  <div className="space-y-3">
    {/* X (Twitter) */}
<div>
  <div className="flex items-center gap-2 mb-2">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
    <span className="text-muted text-sm">X (Twitter)</span>
    {formData.tier === 'premium' && <span className="text-rose-500">*</span>}
  </div>
  <input
    type="url"
    value={formData.twitter}
    onChange={(e) => setFormData({...formData, twitter: e.target.value})}
    className={`w-full bg-black border-2 ${
      formData.tier === 'premium' && !formData.twitter 
        ? 'border-red-500' 
        : 'border-line'
    } focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none text-sm`}
    placeholder="https://x.com/yourtoken"
    required={formData.tier === 'premium'}
  />
</div>

{/* Telegram */}
<div>
  <div className="flex items-center gap-2 mb-2">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.692-1.653-1.123-2.678-1.799-1.185-.781-.417-1.21.258-1.911.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.242-1.865-.442-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635.099-.002.321.023.465.141.121.099.154.232.17.326.016.094.036.308.02.475z"/>
    </svg>
    <span className="text-muted text-sm">Telegram</span>
    {formData.tier === 'premium' && <span className="text-rose-500">*</span>}
  </div>
  <input
    type="url"
    value={formData.telegram}
    onChange={(e) => setFormData({...formData, telegram: e.target.value})}
    className={`w-full bg-black border-2 ${
      formData.tier === 'premium' && !formData.telegram 
        ? 'border-red-500' 
        : 'border-line'
    } focus:border-yellow-400 rounded-lg px-4 py-3 text-white outline-none text-sm`}
    placeholder="https://t.me/yourtoken"
    required={formData.tier === 'premium'}
  />
</div>

{/* Website */}
<div>
  <div className="flex items-center gap-2 mb-2">
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
    <span className="text-muted text-sm">Website</span>
  </div>
  <input
    type="url"
    value={formData.website}
    onChange={(e) => setFormData({...formData, website: e.target.value})}
    className="w-full bg-white border-2 border-line focus:border-brand rounded-lg px-4 py-3 text-ink outline-none text-sm"
    placeholder="https://yourtoken.com"
  />
</div>
  
  {/* Add this warning */}
  {formData.tier === 'premium' && (!formData.twitter || !formData.telegram) && (
    <p className="text-rose-500 text-sm mt-2">
      ⚠️ Premium tokens require X (Twitter) and Telegram links
    </p>
  )}
</div>
  </div>

          {/* Category */}
          <div className="mb-6">
            <label className="block text-ink font-semibold mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value as any})}
              className="w-full bg-white border-2 border-line focus:border-brand rounded-lg px-4 py-3 text-ink outline-none"
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
            <label className="block text-ink font-semibold mb-3">
              Launch Tier
            </label>
            <div className="grid md:grid-cols-2 gap-4">
              {/* Free Tier */}
              <div
                onClick={() => setFormData({...formData, tier: 'free', antiBotEnabled: false})}
                className={`cursor-pointer p-6 rounded-xl border-2 transition ${
                  formData.tier === 'free'
                    ? 'border-brand bg-brand/10'
                    : 'border-line hover:border-[#b79ad8]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-ink">Free</h3>
                  <span className="text-2xl font-bold text-brand">0.02 SOL</span>
                </div>
                <p className="text-sm text-muted">~$2</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>✓ Basic listing</li>
                  <li>✓ Bonding curve</li>
                  <li>✓ Address ends in ...LoL</li>
                  <li>✗ Featured placement</li>
                  <li>✗ Anti-bot protection</li>
                </ul>
              </div>

              {/* Premium Tier */}
              <div
                onClick={() => setFormData({...formData, tier: 'premium'})}
                className={`cursor-pointer p-6 rounded-xl border-2 transition ${
                  formData.tier === 'premium'
                    ? 'border-brand bg-brand/10'
                    : 'border-line hover:border-[#b79ad8]'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-ink">Premium</h3>
                  <span className="text-2xl font-bold text-brand">0.5 SOL</span>
                </div>
                <p className="text-sm text-muted">~$94</p>
                <ul className="mt-4 space-y-2 text-sm text-muted">
                  <li>✓ Featured placement</li>
                  <li>✓ Category badge</li>
                  <li>✓ Premium badge</li>
                  <li>✓ Optional anti-bot</li>
                  <li>✓ Choose ...LoL or random address</li>
                </ul>
              </div>
            </div>
          </div>

          {formData.tier === 'premium' && (
            <div className="mb-6 bg-white/70 p-4 rounded-xl border border-brand/30 flex gap-3">
              {(['vanity', 'random'] as const).map((c) => (
                <button type="button" key={c} onClick={() => setVanityChoice(c)}
                  className={`flex-1 p-3 rounded-lg border-2 text-sm font-semibold ${vanityChoice === c ? 'border-yellow-400 text-yellow-400' : 'border-gray-700 text-gray-400'}`}>
                  {c === 'vanity' ? 'Address ending ...LoL' : 'Random address'}
                </button>
              ))}
            </div>
          )}
          {needsVanity && (
            <p className="mb-4 text-brand text-sm">
              {vanityReady
                ? '✅ ...LoL address ready'
                : `🔎 Generating ...LoL address in background… ${grindAttempts.toLocaleString()} tries${grinding ? ' (finishing, please wait)' : ''}`}
            </p>
          )}

          {/* Anti-Bot Toggle (Premium Only) */}
          {formData.tier === 'premium' && (
            <div className="mb-6 bg-white/70 p-6 rounded-xl border border-brand/30">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <h3 className="text-ink font-semibold mb-1">Anti-Bot Protection</h3>
                  <p className="text-sm text-muted">
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
            <label className="block text-ink font-semibold mb-2">
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
            <div className="flex justify-between text-sm text-muted mt-1">
              <span>Instant</span>
              <span>5 minutes</span>
            </div>
          </div>

          {/* Dev Buy Option */}
          <div className="mb-8 bg-white/70 p-6 rounded-xl border border-brand/30">
            <h3 className="text-ink font-semibold mb-2">🎯 Optional: Buy Initial Supply</h3>
            <p className="text-sm text-muted mb-4">
              Buy tokens immediately after creation. Shows commitment and starts your position.
            </p>
            
            <label className="block text-ink font-semibold mb-2">
              Buy Amount (SOL)
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="5"
              value={formData.devBuyAmount}
              onChange={(e) => setFormData({...formData, devBuyAmount: parseFloat(e.target.value) || 0})}
              className="w-full bg-white border-2 border-line focus:border-brand rounded-lg px-4 py-3 text-ink outline-none"
              placeholder="0 (no buy) or 0.1-5.0 SOL"
            />
            
            {formData.devBuyAmount > 0 && (
              <div className="mt-3 p-3 bg-brand/10 rounded-lg">
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
                    <p className="text-sm text-brand">
                      📊 You'll receive approximately {tokensReceived >= 1000000 
                        ? `${(tokensReceived / 1000000).toFixed(2)}M` 
                        : `${(tokensReceived / 1000).toFixed(1)}K`} tokens (~{percentOfSupply.toFixed(2)}%)
                    </p>
                  );
                })()}
                <p className="text-xs text-muted mt-1">
                  Total cost: {(parseFloat(formData.tier === 'free' ? '0.02' : '0.5') + formData.devBuyAmount).toFixed(2)} SOL
                </p>
              </div>
            )}
            
            <p className="text-xs text-[#8a8291] mt-3">
              💡 Tip: 0.5-1 SOL buy shows strong commitment to your token
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isCreating || !imageFile}
            className="w-full bg-brand hover:bg-brand disabled:bg-[#d9c9ed] text-white font-bold py-4 rounded-lg transition text-lg"
          >
            {isCreating 
              ? 'Creating...' 
              : `Create Token (${(parseFloat(formData.tier === 'free' ? '0.02' : '0.5') + formData.devBuyAmount).toFixed(2)} SOL)`
            }
          </button>

          {!imageFile && (
            <p className="text-center text-rose-500 text-sm mt-2">
              Please upload an image to continue
            </p>
          )}
        </form>
      )}
    </div>
  </div>
);
} 