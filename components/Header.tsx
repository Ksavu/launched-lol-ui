'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';

export const Header = () => {
  return (
    <header className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-8">
            <Link href="/">
              <Image
                src="/logo.jpg"       // your logo file in public/
                alt="Launched.lol Logo"
                width={140}          // adjust width as needed
                height={40}          // adjust height as needed
                priority
              />
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-6">
              <Link
                href="/"
                className="text-white font-medium hover:bg-clip-text hover:text-transparent hover:bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] transition"
              >
                Home
              </Link>
              <Link
                href="/create"
                className="text-white font-medium hover:bg-clip-text hover:text-transparent hover:bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] transition"
              >
                Create Token
              </Link>
              <Link
                href="/tokens"
                className="text-white font-medium hover:bg-clip-text hover:text-transparent hover:bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] transition"
              >
                Explore
              </Link>
            </nav>
          </div>

          {/* Wallet Button */}
          <WalletMultiButton className="!bg-gradient-to-r !from-[#FCD52F] !via-[#FFD845] !to-[#FCD52F] !text-black hover:!brightness-105" />
        </div>
      </div>
    </header>
  );
};
