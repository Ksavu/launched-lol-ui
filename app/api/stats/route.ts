import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');

export async function GET() {
  try {
    // Get all token accounts
    const tokenAccounts = await connection.getProgramAccounts(TOKEN_FACTORY_PROGRAM_ID);
    const tokensLaunched = tokenAccounts.length;
    
    // Get all bonding curves
    const curveAccounts = await connection.getProgramAccounts(BONDING_CURVE_PROGRAM_ID);
    
    let tvl = 0;
    let graduated = 0;
    
    curveAccounts.forEach(({ account }) => {
      try {
        const data = account.data;
        
        // Parse SOL collected (offset 80)
        const solCollected = Number(data.readBigUInt64LE(80)) / 1_000_000_000;
        tvl += solCollected;
        
        // Parse graduated flag (offset 187)
        const isGraduated = data[187] === 1;
        if (isGraduated) graduated++;
      } catch (error) {
        // Skip malformed accounts
      }
    });
    
    return NextResponse.json({
      tokensLaunched,
      tvl: tvl.toFixed(2),
      graduated,
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      tokensLaunched: 0,
      tvl: '0',
      graduated: 0,
    });
  }
}