'use client';

import Link from 'next/link';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useState } from 'react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">
              Launched.lol
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              href="/explore" 
              className="text-gray-300 hover:text-white transition font-medium"
            >
              Explore
            </Link>
            <Link 
              href="/create" 
              className="text-gray-300 hover:text-white transition font-medium"
            >
              Create
            </Link>
            <Link 
              href="/portfolio" 
              className="text-gray-300 hover:text-white transition font-medium"
            >
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
              className="block text-gray-300 hover:text-white transition font-medium py-2"
            >
              Explore
            </Link>
            <Link 
              href="/create" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-300 hover:text-white transition font-medium py-2"
            >
              Create
            </Link>
            <Link 
              href="/portfolio" 
              onClick={() => setMobileMenuOpen(false)}
              className="block text-gray-300 hover:text-white transition font-medium py-2"
            >
              Portfolio
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}