import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');

export async function GET() {
  try {
    console.log('🔍 Fetching all token metadata accounts...');
    
    const accounts = await connection.getProgramAccounts(TOKEN_FACTORY_PROGRAM_ID, {
      filters: [
        {
          dataSize: 8 + 32 + 32 + 36 + 14 + 204 + 1 + 1 + 8 + 8 + 32 + 1 + 1 + 1 + 1,
        },
      ],
    });
    
    console.log(`✅ Found ${accounts.length} tokens`);
    
    const tokens = await Promise.all(
      accounts.map(async ({ account }) => {
        try {
          const data = account.data;
          
          // Parse TokenMetadata
          const mint = new PublicKey(data.slice(8, 40));
          const creator = new PublicKey(data.slice(40, 72));
          
          // Parse name
          const nameLength = data.readUInt32LE(72);
          const name = data.slice(76, 76 + nameLength).toString('utf8');
          
          // Parse symbol
          const symbolOffset = 76 + nameLength;
          const symbolLength = data.readUInt32LE(symbolOffset);
          const symbol = data.slice(symbolOffset + 4, symbolOffset + 4 + symbolLength).toString('utf8');
          
          // Parse uri
          const uriOffset = symbolOffset + 4 + symbolLength;
          const uriLength = data.readUInt32LE(uriOffset);
          const uri = data.slice(uriOffset + 4, uriOffset + 4 + uriLength).toString('utf8');

          // Parse tier (isPremium) - byte after uri
          const tierOffset = uriOffset + 4 + uriLength;
          const tier = data[tierOffset];
          const isPremium = tier === 1; // 0 = free, 1 = premium

          // Parse category (one byte after tier)
          const category = data[uriOffset + 1];
          
          // Get bonding curve data
          const [bondingCurve] = PublicKey.findProgramAddressSync(
            [Buffer.from('bonding-curve'), mint.toBuffer()],
            BONDING_CURVE_PROGRAM_ID
          );
          
          let solCollected = 0;
          let tokensSold = 0;
          let isActive = false;
          let graduated = false;
          let bondingCurveStatus = 'not_found';
          
          try {
            const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
            if (bondingCurveAccount) {
              const curveData = bondingCurveAccount.data;
              
              // Check discriminator
              const expectedDiscriminator = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);
              const actualDiscriminator = curveData.slice(0, 8);
              
              if (actualDiscriminator.equals(expectedDiscriminator)) {
                bondingCurveStatus = 'valid';
                
                tokensSold = Number(curveData.readBigUInt64LE(112)) / 1_000_000;
                solCollected = Number(curveData.readBigUInt64LE(120)) / 1_000_000_000;
                
                const rawSolCollected = Number(curveData.readBigUInt64LE(120));
                const isGraduated = rawSolCollected >= 81_000_000_000;
                const isActiveFlag = curveData[168] === 1;
                
                graduated = isGraduated;
                isActive = !isGraduated && isActiveFlag;
              }
            }
          } catch (err) {
            console.error('Error parsing curve data:', err);
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
          
          // Fetch SOL price
          let solPrice = 200; // default fallback
              try {
          const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
          const priceData = await priceResponse.json();
                solPrice = priceData.solana.usd;
          } catch (e) {
                console.log('Failed to fetch SOL price, using $200');
          }
          
          // Calculate market cap
          const VIRTUAL_SOL = 30_000_000_000;
          const VIRTUAL_TOKENS = 1_040_000_000_000_000;
          const TOTAL_SUPPLY = 1_000_000_000_000_000;

          let marketCap = 0;
          if (bondingCurveStatus === 'valid') {
            const solCollectedLamports = solCollected; // Already in lamports from line 97
            const tokensSoldLamports = tokensSold; // Already in lamports from line 96
  
            const currentVirtualSol = VIRTUAL_SOL + solCollectedLamports;
            const currentVirtualTokens = VIRTUAL_TOKENS - tokensSoldLamports;
  
            const pricePerToken = currentVirtualSol / currentVirtualTokens;
            const marketCapLamports = pricePerToken * TOTAL_SUPPLY;
            const marketCapSOL = marketCapLamports / 1_000_000_000;
  
                  marketCap = marketCapSOL * solPrice;
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
            bondingCurveStatus,
            solCollected,
            tokensSold,
            progress: bondingCurveStatus === 'valid' ? (solCollected / 81) * 100 : 0,
            isActive,
            graduated,
            marketCap,
            category: ['meme', 'ai', 'gaming', 'defi', 'nft', 'other'][category] || 'other',
            isPremium,
          };
          
        } catch (error) {
          console.error('Error parsing token:', error);
          return null;
        }
      })
    );
    
    const validTokens = tokens
       .filter((t) => t !== null)
       .filter((t) => t!.bondingCurveStatus === 'valid') // ← Only show valid bonding curves
       .sort((a, b) => b!.solCollected - a!.solCollected);

    return NextResponse.json({ tokens: validTokens });
    
  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json({ error: 'Failed to fetch tokens' }, { status: 500 });
  }
}