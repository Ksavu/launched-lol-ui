import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    console.log('🔍 Mint from params:', mint);
    
    if (!mint) {
      return NextResponse.json({ error: 'Mint address is required' }, { status: 400 });
    }
    
    // Validate mint address
    let mintPubkey: PublicKey;
    try {
      mintPubkey = new PublicKey(mint);
      console.log('✅ Valid mint address:', mintPubkey.toBase58());
    } catch (e) {
      console.error('❌ Invalid mint address:', mint);
      return NextResponse.json({ 
        error: 'Invalid mint address',
        received: mint 
      }, { status: 400 });
    }
    
    // Fetch token metadata
    const accounts = await connection.getProgramAccounts(TOKEN_FACTORY_PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 8,
            bytes: mintPubkey.toBase58(),
          },
        },
      ],
    });

    if (accounts.length === 0) {
      return NextResponse.json({ error: 'Token not found' }, { status: 404 });
    }

    const data = accounts[0].account.data;
    
    // Parse token metadata
    const creator = new PublicKey(data.slice(40, 72));
    
    const nameLength = data.readUInt32LE(72);
    const name = data.slice(76, 76 + nameLength).toString('utf8');
    
    const symbolOffset = 76 + nameLength;
    const symbolLength = data.readUInt32LE(symbolOffset);
    const symbol = data.slice(symbolOffset + 4, symbolOffset + 4 + symbolLength).toString('utf8');
    
    const uriOffset = symbolOffset + 4 + symbolLength;
    const uriLength = data.readUInt32LE(uriOffset);
    const uri = data.slice(uriOffset + 4, uriOffset + 4 + uriLength).toString('utf8');

    // Parse tier (isPremium)
    const tierOffset = uriOffset + 4 + uriLength;
    const tier = data[tierOffset];
    const isPremium = tier === 1;

    // Parse socials (twitter, telegram, website)
    const twitterOffset = tierOffset + 1 + 1; // tier + category
    const twitterLength = data.readUInt32LE(twitterOffset);
    const twitter = twitterLength > 0 
      ? data.slice(twitterOffset + 4, twitterOffset + 4 + twitterLength).toString('utf8')
      : undefined;

    const telegramOffset = twitterOffset + 4 + twitterLength;
    const telegramLength = data.readUInt32LE(telegramOffset);
    const telegram = telegramLength > 0
      ? data.slice(telegramOffset + 4, telegramOffset + 4 + telegramLength).toString('utf8')
      : undefined;

    const websiteOffset = telegramOffset + 4 + telegramLength;
    const websiteLength = data.readUInt32LE(websiteOffset);
    const website = websiteLength > 0
      ? data.slice(websiteOffset + 4, websiteOffset + 4 + websiteLength).toString('utf8')
      : undefined;

    // Get bonding curve data
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
      BONDING_CURVE_PROGRAM_ID
    );
    
    let bondingCurveStatus: 'valid' | 'corrupted' | 'not_found' = 'not_found';
    let solCollected = 0;
    let tokensSold = 0;
    let isActive = false;
    let graduated = false;
    let virtualSolReserves = 0;
    let virtualTokenReserves = 0;
    let totalSupply = 0;
    
    try {
      const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
      
      if (bondingCurveAccount) {
        const curveData = bondingCurveAccount.data;
        
        // Check discriminator
        const expectedDiscriminator = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);
        const actualDiscriminator = curveData.slice(0, 8);
        
        if (actualDiscriminator.equals(expectedDiscriminator)) {
          bondingCurveStatus = 'valid';
          
          // Read all bonding curve data
          totalSupply = Number(curveData.readBigUInt64LE(104));
          tokensSold = Number(curveData.readBigUInt64LE(112)) / 1_000_000;
          solCollected = Number(curveData.readBigUInt64LE(120));
          virtualSolReserves = Number(curveData.readBigUInt64LE(136)); // ✅ offset 136
          virtualTokenReserves = Number(curveData.readBigUInt64LE(144)); // ✅ offset 144
          isActive = curveData[168] === 1;
          graduated = curveData[187] === 1;
          
          console.log('📊 Bonding curve data:', {
            totalSupply,
            tokensSold,
            solCollected: solCollected / 1e9,
            virtualSolReserves: virtualSolReserves / 1e9,
            virtualTokenReserves: virtualTokenReserves / 1e6,
            isActive,
            graduated,
          });
        } else {
          bondingCurveStatus = 'corrupted';
        }
      }
    } catch (error) {
      console.log('Error fetching bonding curve');
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
      console.log('Failed to fetch metadata');
    }

    // Fetch SOL price
    let solPrice = 200;
    try {
      const priceResponse = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const priceData = await priceResponse.json();
      solPrice = priceData.solana.usd;
    } catch (e) {
      console.log('Failed to fetch SOL price, using $200');
    }

    // Calculate market cap using CURRENT reserves
    let marketCap = 0;
    if (bondingCurveStatus === 'valid') {
      if (graduated) {
        // Post-graduation: 75 SOL for 20% supply = 375 SOL total market cap
        marketCap = 375 * solPrice;
      } else {
        // Pre-graduation: Use current virtual reserves
        const currentVirtualSol = virtualSolReserves / 1e9;
        const currentVirtualTokens = virtualTokenReserves / 1e6;
        
        if (currentVirtualTokens > 0) {
          const pricePerToken = currentVirtualSol / currentVirtualTokens;
          const TOTAL_SUPPLY = 1_000_000_000;
          marketCap = TOTAL_SUPPLY * pricePerToken * solPrice;
        }
      }
    }

    const tokenData = {
      address: mintPubkey.toBase58(),
      name,
      symbol,
      uri,
      imageUrl,
      description,
      creator: creator.toBase58(),
      bondingCurve: bondingCurve.toBase58(),
      bondingCurveStatus,
      solCollected: solCollected / 1_000_000_000,
      tokensSold,
      progress: bondingCurveStatus === 'valid' ? (solCollected / 81_000_000_000) * 100 : 0,
      isActive: bondingCurveStatus === 'valid' && isActive && !graduated,
      graduated: bondingCurveStatus === 'valid' && graduated,
      marketCap,
      isPremium,
      twitter,
      telegram,
      website,
      virtualSolReserves, // ✅ Added
      virtualTokenReserves, // ✅ Added
      totalSupply, // ✅ Added
    };

    return NextResponse.json({ token: tokenData });
  } catch (error) {
    console.error('Error fetching token:', error);
    return NextResponse.json({ error: 'Failed to fetch token' }, { status: 500 });
  }
}