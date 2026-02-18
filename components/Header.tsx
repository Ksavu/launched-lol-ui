'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
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
            <Link href="/portfolio" className="text-gray-300 hover:text-yellow-400 transition">
              Portfolio
            </Link>            
          </nav>
            
          {/* Wallet Button & Mobile Menu Toggle */}
          <div className="flex items-center gap-4">
            <WalletMultiButton className="!text-sm !py-2" />
            
            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

{/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3 border-t border-gray-800">
            <Link 
              href="/explore" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-300 hover:text-yellow-400 transition font-medium py-2"
            >
              Explore
            </Link>
            <Link 
              href="/create" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-300 hover:text-yellow-400 transition font-medium py-2"
            >
              Create
            </Link>
            <Link 
              href="/portfolio" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-300 hover:text-yellow-400 transition font-medium py-2"
            >
              Portfolio
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}