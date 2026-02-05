'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export const Header = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="bg-black border-b border-yellow-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
            <div className="w-8 h-8 sm:w-12 sm:h-12">
  <Image 
    src="/logo.jpg" 
    alt="Launched.lol" 
    width={48}
    height={48}
    className="object-contain w-full h-full"
  />
</div>
            <span className="text-lg sm:text-2xl font-bold text-yellow-400">
              launched.lol
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex space-x-6">
            <Link href="/" className="text-gray-300 hover:text-yellow-400 transition">
              Home
            </Link>
            <Link href="/create" className="text-gray-300 hover:text-yellow-400 transition">
              Create Token
            </Link>
            <Link href="/explore" className="text-gray-300 hover:text-yellow-400 transition">
              Explore
            </Link>
          </nav>

          {/* Wallet Button - Only render after mount */}
          <div className="flex-shrink-0">
            {mounted ? (
              <WalletMultiButton className="!bg-yellow-400 hover:!bg-yellow-500 !text-black !font-bold !text-xs sm:!text-sm !px-3 sm:!px-4 !py-2 !h-10 sm:!h-12" />
            ) : (
              <div className="bg-yellow-400 text-black font-bold text-xs sm:text-sm px-3 sm:px-4 py-2 h-10 sm:h-12 rounded-lg flex items-center">
                Connect Wallet
              </div>
            )}
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="lg:hidden flex justify-center space-x-6 pb-4 border-t border-yellow-400/10 pt-4">
          <Link href="/" className="text-sm text-gray-300 hover:text-yellow-400 transition">
            Home
          </Link>
          <Link href="/create" className="text-sm text-gray-300 hover:text-yellow-400 transition">
            Create
          </Link>
          <Link href="/explore" className="text-sm text-gray-300 hover:text-yellow-400 transition">
            Explore
          </Link>
        </nav>
      </div>
    </header>
  );
};