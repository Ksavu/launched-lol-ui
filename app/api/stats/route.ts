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
    
    for (const { pubkey, account } of curveAccounts) {
      try {
        const data = account.data;
        
        // Check if account has valid discriminator
        const expectedDiscriminator = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);
        const actualDiscriminator = data.slice(0, 8);
        
        if (!actualDiscriminator.equals(expectedDiscriminator)) {
          continue; // Skip invalid accounts
        }
        
        // Get SOL balance directly from the account (in lamports)
        const accountBalance = account.lamports;
        
        // Subtract rent exemption (approximately 0.0024 SOL)
        const RENT_EXEMPTION = 2_400_000; // Approximate rent for bonding curve account
        const solBalance = Math.max(0, accountBalance - RENT_EXEMPTION);
        
        tvl += solBalance / 1_000_000_000;
        
        // Parse graduated flag (offset 187, bool)
        const isGraduated = data[187] === 1;
        if (isGraduated) graduated++;
        
      } catch (error) {
        console.error('Error parsing curve account:', error);
      }
    }
    
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