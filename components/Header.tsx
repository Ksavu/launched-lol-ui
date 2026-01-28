'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';

export const Header = () => {
  return (
    <header className="bg-black border-b border-yellow-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 relative">
                <Image 
                  src="/logo.jpg" 
                  alt="Launched.lol" 
                  fill
                  className="object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-yellow-400">
                launched.lol
              </span>
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-300 hover:text-yellow-400 transition">
                Home
              </Link>
              <Link href="/create" className="text-gray-300 hover:text-yellow-400 transition">
                Create Token
              </Link>
              <Link href="/tokens" className="text-gray-300 hover:text-yellow-400 transition">
                Explore
              </Link>
            </nav>
          </div>
          <WalletMultiButton className="!bg-yellow-400 hover:!bg-yellow-500 !text-black !font-bold" />
        </div>
      </div>
    </header>
  );
};