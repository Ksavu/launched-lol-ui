import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('FqjbzRkHvZ6kAQkXHR4aZ5EECrtXeMkJF46Di55na6Hq');

// Max tokens to fetch for performance
const MAX_TOKENS = 20;

export async function GET() {
  try {
    console.log('🔍 Fetching token metadata accounts...');

    const accounts = await connection.getProgramAccounts(TOKEN_FACTORY_PROGRAM_ID, {
      filters: [
        { dataSize: 8 + 32 + 32 + 36 + 14 + 204 + 1 + 1 + 8 + 8 + 32 + 1 + 1 + 1 + 1 },
      ],
    });

    const tokens = await Promise.allSettled(
      accounts.slice(0, MAX_TOKENS).map(async ({ pubkey, account }) => {
        try {
          const data = account.data;
          if (data.length < 100) return null; // fallback for short data

          const mint = new PublicKey(data.slice(8, 40));
          const creator = new PublicKey(data.slice(40, 72));

          const nameLength = data.readUInt32LE(72);
          const name = data.slice(76, 76 + nameLength).toString('utf8');

          const symbolOffset = 76 + nameLength;
          const symbolLength = data.readUInt32LE(symbolOffset);
          const symbol = data.slice(symbolOffset + 4, symbolOffset + 4 + symbolLength).toString('utf8');

          const uriOffset = symbolOffset + 4 + symbolLength;
          const uriLength = data.readUInt32LE(uriOffset);
          const uri = data.slice(uriOffset + 4, uriOffset + 4 + uriLength).toString('utf8');

          const tierOffset = uriOffset + 4 + uriLength;
          const tier = data[tierOffset] || 0;
          const category = data[tierOffset + 1] || 5;

          // Find bonding curve PDA
          const [bondingCurve] = PublicKey.findProgramAddressSync(
            [Buffer.from('bonding-curve'), mint.toBuffer()],
            BONDING_CURVE_PROGRAM_ID
          );

          // Default values
          let solCollected = 0;
          let tokensSold = 0;
          let isActive = false;

          try {
            const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
            if (bondingCurveAccount && bondingCurveAccount.data.length > 120) {
              const curveData = bondingCurveAccount.data;
              tokensSold = Number(curveData.readBigUInt64LE(8 + 104));
              solCollected = Number(curveData.readBigUInt64LE(8 + 112));
              isActive = curveData[8 + 136] === 1;
            }
          } catch {}

          // Return token without waiting for IPFS metadata
          return {
            address: mint.toBase58(),
            name,
            symbol,
            uri,
            imageUrl: '', // fetch on frontend later
            description: '',
            creator: creator.toBase58(),
            bondingCurve: bondingCurve.toBase58(),
            solCollected: solCollected / 1_000_000_000,
            tokensSold: tokensSold / 1_000_000,
            progress: (solCollected / 81_000_000_000) * 100,
            isActive,
            marketCap: (solCollected / 1_000_000_000) * 2,
            category: ['meme', 'ai', 'gaming', 'defi', 'nft', 'other'][category] || 'other',
          };
        } catch (e) {
          console.error('Failed to parse token', e);
          return null;
        }
      })
    );

    // Only keep successfully parsed tokens
    const validTokens = tokens
      .filter(t => t.status === 'fulfilled' && t.value !== null)
      .map(t => (t as PromiseFulfilledResult<any>).value)
      .sort((a, b) => b.solCollected - a.solCollected);

    return NextResponse.json({ tokens: validTokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}
