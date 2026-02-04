import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('FqjbzRkHvZ6kAQkXHR4aZ5EECrtXeMkJF46Di55na6Hq');

export async function GET() {
  try {
    console.log('🔍 Fetching all token metadata accounts...');
    
    // Fetch all TokenMetadata accounts
    const accounts = await connection.getProgramAccounts(TOKEN_FACTORY_PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 32 + 32 + 36 + 14 + 204 + 1 + 1 + 8 + 8 + 32 + 1 + 1 + 1 + 1, // TokenMetadata size
        },
      ],
    });
    
    console.log(`✅ Found ${accounts.length} tokens`);
    
    const tokens = await Promise.all(
      accounts.map(async ({ pubkey, account }) => {
        try {
          const data = account.data;
          
          // Parse TokenMetadata
          const mint = new PublicKey(data.slice(8, 40));
          const creator = new PublicKey(data.slice(40, 72));
          
          // Parse name (u32 length + string)
          const nameLength = data.readUInt32LE(72);
          const name = data.slice(76, 76 + nameLength).toString('utf8');
          
          // Parse symbol (after name)
          const symbolOffset = 76 + nameLength;
          const symbolLength = data.readUInt32LE(symbolOffset);
          const symbol = data.slice(symbolOffset + 4, symbolOffset + 4 + symbolLength).toString('utf8');
          
          // Parse uri (after symbol)
          const uriOffset = symbolOffset + 4 + symbolLength;
          const uriLength = data.readUInt32LE(uriOffset);
          const uri = data.slice(uriOffset + 4, uriOffset + 4 + uriLength).toString('utf8');

          // Parse tier (after uri) - NEW!
          const tierOffset = uriOffset + 4 + uriLength;
          const tier = data[tierOffset]; // 0 = Free, 1 = Premium

          // Parse category (after tier) - NEW!
          const category = data[tierOffset + 1]; // 0=meme, 1=ai, 2=gaming, 3=defi, 4=nft, 5=other
          
          // Get bonding curve data
          const [bondingCurve] = PublicKey.findProgramAddressSync(
            [Buffer.from('bonding-curve'), mint.toBuffer()],
            BONDING_CURVE_PROGRAM_ID
          );
          
          let solCollected = 0;
          let tokensSold = 0;
          let isActive = false;
          
        try {
          const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
          if (bondingCurveAccount) {
            const curveData = bondingCurveAccount.data;
    
            // Skip discriminator (8 bytes) then parse struct
            tokensSold = Number(curveData.readBigUInt64LE(8 + 104)); // tokens_sold at offset 104
            solCollected = Number(curveData.readBigUInt64LE(8 + 112)); // sol_collected at offset 112
            isActive = curveData[8 + 136] === 1; // is_active at offset 136
          }
        } catch (error) {
          console.log(`No bonding curve for ${mint.toBase58()}`);
        }
          
          // Fetch metadata from IPFS
          let imageUrl = '';
          let description = '';
          try {
            const metadataResponse = await fetch(uri, { signal: AbortSignal.timeout(3000) });
            if (metadataResponse.ok) {
              const metadata = await metadataResponse.json();
              imageUrl = metadata.image || '';
              description = metadata.description || '';
            }
          } catch (error) {
            console.log(`Failed to fetch metadata for ${name}`);
          }
          
          return {
            address: mint.toBase58(),
            name,
            symbol,
            uri,
            imageUrl,
            description,
            creator: creator.toBase58(),
            bondingCurve: bondingCurve.toBase58(),
            solCollected: solCollected / 1_000_000_000, // Convert to SOL
            tokensSold: tokensSold / 1_000_000, // Convert to whole tokens
            progress: (solCollected / 81_000_000_000) * 100, // % to 81 SOL
            isActive,
            marketCap: (solCollected / 1_000_000_000) * 2, // Rough estimate
            category: ['meme', 'ai', 'gaming', 'defi', 'nft', 'other'][category] || 'other',
          };
        } catch (error) {
          console.error('Error parsing token:', error);
          return null;
        }
      })
    );
    
    // Filter out nulls and sort by SOL collected
    const validTokens = tokens
      .filter((t) => t !== null)
      .sort((a, b) => b!.solCollected - a!.solCollected);
    
    return NextResponse.json({ tokens: validTokens });
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}