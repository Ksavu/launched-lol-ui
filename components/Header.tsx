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
            
            {/* Logo with gradient overlay and hover effect */}
            <Link href="/">
              <div className="h-10 flex items-center relative group transition-transform duration-300 hover:scale-105">
                <Image
                  src="/logo.jpg"
                  alt="Launched.lol Logo"
                  width={140}
                  height={40}
                  className="object-contain drop-shadow-[0_0_10px_#FCD52F] relative z-10"
                  priority
                />
                {/* Gradient overlay shine */}
                <div className="absolute inset-0 bg-gradient-to-r from-[#FCD52F] via-[#FFD845] to-[#FCD52F] opacity-20 pointer-events-none rounded transition-opacity duration-500 group-hover:opacity-50"></div>
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
