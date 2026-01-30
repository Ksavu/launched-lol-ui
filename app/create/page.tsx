'use client';

import { useState } from 'react';
import { Header } from '../../components/Header';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import Image from 'next/image';

export default function CreateToken() {
  const { publicKey, connected, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    description: '',
    tier: 'free' as 'Free' | 'Premium',
    category: 'meme' as 'Meme' | 'Ai' | 'Gaming' | 'DeFi' | 'Nft' | 'Other',
    antiBotEnabled: false,
    launchDelay: 60,
  });
  
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
      
      // Dynamic import to avoid SSR issues
      const { getProvider, createToken } = await import('../../lib/anchor-client');
      
      const provider = getProvider(connection, { publicKey, signTransaction, signAllTransactions } as any);
      
      // Treasury wallet (you can change this to your own wallet)
      const treasuryWallet = new PublicKey('GtcpcvS3k24MA3Yhs6bAd1spkdjYmx82KqRxSk6pPWhE'); // Replace with your treasury
      
      const result = await createToken(provider, {
        name: formData.name,
        symbol: formData.symbol,
        uri: metadataUrl,
        tier: formData.tier,
        category: formData.category,
        launchDelay: formData.launchDelay,
        antiBotEnabled: formData.antiBotEnabled,
        treasuryWallet,
      });
      
      console.log('✅ Token created on-chain!', result);
      
      alert(`🎉 SUCCESS!\n\nToken: ${result.mint}\nTX: ${result.signature}\n\nView on Solana Explorer!`);
      
      // Reset form
      setFormData({
        name: '',
        symbol: '',
        description: '',
        tier: 'Free',
        category: 'Meme',
        antiBotEnabled: false,
        launchDelay: 60,
      });
      setImageFile(null);
      setImagePreview('');
      
    } catch (error) {
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
                  onClick={() => setFormData({...formData, tier: 'Free', antiBotEnabled: false})}
                  className={`cursor-pointer p-6 rounded-xl border-2 transition ${
                    formData.tier === 'Free'
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
                  onClick={() => setFormData({...formData, tier: 'Premium'})}
                  className={`cursor-pointer p-6 rounded-xl border-2 transition ${
                    formData.tier === 'Premium'
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
            {formData.tier === 'Premium' && (
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

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCreating || !imageFile}
              className="w-full bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-600 text-black font-bold py-4 rounded-lg transition text-lg"
            >
              {isCreating ? 'Creating...' : `Create Token (${formData.tier === 'Free' ? '0.01 SOL' : '0.5 SOL'})`}
            </button>

            {!imageFile && (
              <p className="text-center text-red-400 text-sm mt-2">
                Please upload an image to continue
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}