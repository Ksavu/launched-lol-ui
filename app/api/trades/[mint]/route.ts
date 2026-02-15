import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');

interface Trade {
  type: 'buy' | 'sell';
  tokens: number;
  sol: number;
  price: number;
  timestamp: number;
  signature: string;
  user: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    
    console.log('📊 Fetching trades for mint:', mint);
    
    // Get bonding curve address
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), new PublicKey(mint).toBuffer()],
      BONDING_CURVE_PROGRAM_ID
    );
    
    console.log('📍 Bonding curve:', bondingCurve.toBase58());
    
    // Fetch recent transaction signatures
    const signatures = await connection.getSignaturesForAddress(
      bondingCurve,
      { limit: 100 }
    );
    
    console.log(`✅ Found ${signatures.length} transactions`);
    
    const trades: Trade[] = [];
    
    // Parse each transaction
    for (const sig of signatures) {
      try {
        const tx = await connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        });
        
        if (!tx || !tx.meta || !tx.blockTime) continue;
        
        const logs = tx.meta.logMessages || [];
        
        // Look for buy/sell logs
        for (const log of logs) {
          // Match: "Bought 33223620 tokens for 990000000 SOL (fee: 10000000)"
          const buyMatch = log.match(/Bought (\d+) tokens for (\d+) SOL \(fee: (\d+)\)/);
          if (buyMatch) {
            const tokens = parseInt(buyMatch[1]) / 1_000_000;
            const sol = parseInt(buyMatch[2]) / 1_000_000_000;
            const price = sol / tokens;
            
            const user = tx.transaction.message.accountKeys[0]?.pubkey.toBase58() || 'unknown';
            
            trades.push({
              type: 'buy',
              tokens,
              sol,
              price,
              timestamp: tx.blockTime,
              signature: sig.signature,
              user,
            });
          }
          
          // Match: "Sold 10000000 tokens for 300000000 SOL (fee: 3000000)"
          const sellMatch = log.match(/Sold (\d+) tokens for (\d+) SOL \(fee: (\d+)\)/);
          if (sellMatch) {
            const tokens = parseInt(sellMatch[1]) / 1_000_000;
            const sol = parseInt(sellMatch[2]) / 1_000_000_000;
            const price = sol / tokens;
            
            const user = tx.transaction.message.accountKeys[0]?.pubkey.toBase58() || 'unknown';
            
            trades.push({
              type: 'sell',
              tokens,
              sol,
              price,
              timestamp: tx.blockTime,
              signature: sig.signature,
              user,
            });
          }
        }
      } catch (error) {
        console.error('Error parsing transaction:', error);
        continue;
      }
    }
    
    trades.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`📈 Extracted ${trades.length} trades`);
    
    return NextResponse.json({ trades, count: trades.length });
    
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch trades',
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}