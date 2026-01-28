'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';

export const Header = () => {
  return (
    <header className="bg-black border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo + Nav */}
          <div className="flex items-center space-x-8">
            
            {/* Logo */}
            <Link href="/">
              <div className="h-12 w-auto flex items-center">
                <Image
                  src="/logo.jpg"
                  alt="Launched.lol Logo"
                  width={160}
                  height={48}
                  className="object-contain"
                  priority
                />
              </div>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-6">
              {["Home", "Create Token", "Explore"].map((item) => (
                <Link
                  key={item}
                  href={item === "Home" ? "/" : item === "Create Token" ? "/create" : "/tokens"}
                  className="text-white font-medium hover:bg-clip-text hover:text-transparent hover:bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] transition"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          {/* Wallet Button */}
          <WalletMultiButton className="!bg-gradient-to-r !from-[#FCD52F] !via-[#FFD845] !to-[#FCD52F] !text-black hover:!brightness-105 transition" />
        </div>
      </div>
    </header>
  );
};
