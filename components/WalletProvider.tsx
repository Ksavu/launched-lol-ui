'use client';

import { FC, ReactNode, useEffect } from 'react';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

export const WalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const endpoint = 'https://api.devnet.solana.com';

  // Suppress MetaMask errors
  useEffect(() => {
    const originalError = console.error;
    console.error = (...args) => {
      if (args[0]?.toString().includes('MetaMask')) return;
      if (args[0]?.toString().includes('WalletConnectionError')) return;
      originalError.apply(console, args);
    };
    return () => {
      console.error = originalError;
    };
  }, []);

  const wallets = [new PhantomWalletAdapter()];

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider 
        wallets={wallets} 
        autoConnect={false}
        onError={(error) => {
          // Silently ignore MetaMask errors
          if (error.message?.includes('MetaMask')) return;
          console.error('Wallet error:', error);
        }}
      >
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};