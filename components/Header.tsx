'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';

export const Header = () => {
  return (
    <header className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold text-white">
              Launched.lol 🚀
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-300 hover:text-white transition">
                Home
              </Link>
              <Link href="/create" className="text-gray-300 hover:text-white transition">
                Create Token
              </Link>
              <Link href="/tokens" className="text-gray-300 hover:text-white transition">
                Explore
              </Link>
            </nav>
          </div>
          <WalletMultiButton className="!bg-purple-600 hover:!bg-purple-700" />
        </div>
      </div>
    </header>
  );
};