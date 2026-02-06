import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';

const BONDING_CURVE_PROGRAM_ID = new PublicKey('94fy3DtZ6fKHg3P5wTkdC8CHkkzWMtUDgaTtLHsqycS8');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');

// Correct discriminators from IDL
const INITIALIZE_CURVE_DISCRIMINATOR = Buffer.from([170, 84, 186, 253, 131, 149, 95, 213]);
const BUY_TOKENS_DISCRIMINATOR = Buffer.from([189, 21, 230, 133, 247, 2, 110, 42]);

export type BondingCurveState = {
  tokensSold: number;
  solCollected: number;
  progress: number;
  graduated: boolean;
};

export async function getBondingCurveState(
  connection: Connection,
  mintAddress: string
): Promise<BondingCurveState> {
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), new PublicKey(mintAddress).toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  const accountInfo = await connection.getAccountInfo(bondingCurve, 'confirmed');
  if (!accountInfo) throw new Error('Bonding curve account not found');

  const data = accountInfo.data;

  console.log('🔍 Raw account data length:', data.length);
  console.log('🔍 First 250 bytes:', Array.from(data.slice(0, 250)));
  
  // Read raw bytes at each offset
  const tokensSoldRaw = data.readBigUInt64LE(112);
  const solCollectedRaw = data.readBigUInt64LE(120);
  const isActiveRaw = data[168];
  
  console.log('🔍 tokens_sold raw (at offset 112):', tokensSoldRaw.toString());
  console.log('🔍 sol_collected raw (at offset 120):', solCollectedRaw.toString());
  console.log('🔍 is_active raw (at offset 168):', isActiveRaw);
  
  const tokensSold = Number(tokensSoldRaw) / 1_000_000;
  const solCollected = Number(solCollectedRaw) / 1_000_000_000;
  const isActive = isActiveRaw === 1;
  
  const graduationThreshold = 81;
  const progress = (solCollected / graduationThreshold) * 100;
  const graduated = !isActive;

  console.log('📊 Bonding Curve State:');
  console.log('  Tokens Sold:', tokensSold.toFixed(2));
  console.log('  SOL Collected:', solCollected.toFixed(6), 'SOL');
  console.log('  Is Active:', isActive);
  console.log('  Progress:', progress.toFixed(4) + '%');
  console.log('  Graduated:', graduated);

  return { tokensSold, solCollected, progress, graduated };
}

export async function initializeBondingCurve(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  treasuryAddress: string,
  isPremium: boolean,
  launchDelay: number,     // 0-300s for both tiers
  enableAntiBot: boolean   // Only works for premium
) {
  const mint = new PublicKey(mintAddress);
  const treasury = new PublicKey(treasuryAddress);
  
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
  
  console.log('📍 Initializing bonding curve:', bondingCurve.toBase58());
  console.log('Premium:', isPremium, 'Launch delay:', launchDelay, 'Anti-bot:', enableAntiBot);
  
  // Serialize: discriminator + mint (32) + treasury (32) + is_premium (1) + launch_delay (8) + enable_anti_bot (1)
  const data = Buffer.alloc(8 + 32 + 32 + 1 + 8 + 1);
  INITIALIZE_CURVE_DISCRIMINATOR.copy(data, 0);
  mint.toBuffer().copy(data, 8);
  treasury.toBuffer().copy(data, 40);
  data.writeUInt8(isPremium ? 1 : 0, 72);
  
  // Write i64 launch_delay
  const delayLow = launchDelay & 0xFFFFFFFF;
  const delayHigh = Math.floor(launchDelay / 0x100000000);
  data.writeUInt32LE(delayLow, 73);
  data.writeInt32LE(delayHigh, 77);
  
  // Write enable_anti_bot
  data.writeUInt8(enableAntiBot ? 1 : 0, 81);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid, 'confirmed');
  
  console.log('✅ Bonding curve initialized with virtual AMM!');
  console.log('📝 TX:', txid);
  
  return txid;
}

export async function buyTokens(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  solAmount: number
) {
  const mint = new PublicKey(mintAddress);
  
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
  
  const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
  if (!bondingCurveAccount) throw new Error('Bonding curve not found');
  
  const treasury = new PublicKey(bondingCurveAccount.data.slice(8 + 64, 8 + 96));
  
  console.log('💰 Buying tokens for', solAmount, 'SOL');
  
  // Serialize: discriminator + sol_amount (u64)
  const data = Buffer.alloc(8 + 8);
  BUY_TOKENS_DISCRIMINATOR.copy(data, 0);
  
  const lamports = Math.floor(solAmount * 1_000_000_000);
  
  // Write u64 as two u32 values (little endian)
  const lamportsLow = lamports & 0xFFFFFFFF;
  const lamportsHigh = Math.floor(lamports / 0x100000000);
  data.writeUInt32LE(lamportsLow, 8);
  data.writeUInt32LE(lamportsHigh, 12);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid, 'confirmed');
  
  console.log('✅ Tokens bought!');
  console.log('📝 TX:', txid);
  
const state = await getBondingCurveState(connection, mintAddress);
console.log('Tokens sold:', state.tokensSold);
console.log('SOL collected:', state.solCollected);

  return txid;
}

// Dev buy discriminator (get from IDL or calculate)
const DEV_BUY_DISCRIMINATOR = Buffer.from([195, 220, 253, 89, 163, 75, 172, 209]);

export async function devBuy(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  solAmount: number
) {
  const mint = new PublicKey(mintAddress);
  
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
  
  const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
  if (!bondingCurveAccount) throw new Error('Bonding curve not found');
  
  const treasury = new PublicKey(bondingCurveAccount.data.slice(72, 104));
  
  console.log('👤 Dev buying tokens for', solAmount, 'SOL');
  
  const data = Buffer.alloc(16);
  DEV_BUY_DISCRIMINATOR.copy(data, 0);
  
  const lamports = Math.floor(solAmount * 1_000_000_000);
  const lamportsLow = lamports & 0xFFFFFFFF;
  const lamportsHigh = Math.floor(lamports / 0x100000000);
  data.writeUInt32LE(lamportsLow, 8);
  data.writeUInt32LE(lamportsHigh, 12);
  
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: treasury, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  });
  
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  
  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid, 'confirmed');
  
  console.log('✅ Dev bought tokens!');
  console.log('📝 TX:', txid);
  
  return txid;
}

export async function sellTokens(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  tokenAmount: number
) {
  try {
    const mint = new PublicKey(mintAddress);
    
    console.log('🔍 Deriving bonding curve PDA...');
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      BONDING_CURVE_PROGRAM_ID
    );
    console.log('Bonding curve:', bondingCurve.toBase58());
    
    console.log('🔍 Fetching bonding curve account...');
    const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
    if (!bondingCurveAccount) throw new Error('Bonding curve not found');
    
    console.log('🔍 Parsing treasury address...');
    const treasury = new PublicKey(bondingCurveAccount.data.slice(8 + 64, 8 + 96));
    console.log('Treasury:', treasury.toBase58());
    
    console.log('💸 Selling', tokenAmount, 'tokens');
    
    // Validate token amount
    if (tokenAmount <= 0 || !Number.isFinite(tokenAmount)) {
      throw new Error('Invalid token amount');
    }
    
    // Correct sell_tokens discriminator
    const SELL_TOKENS_DISCRIMINATOR = Buffer.from([114, 242, 25, 12, 62, 126, 92, 2]);
    
    // Convert tokens to base units (6 decimals)
    const tokenAmountBaseUnits = Math.floor(tokenAmount * 1_000_000);
    console.log('Token amount in base units:', tokenAmountBaseUnits);
    
    // Check if number is too large for u64
    if (tokenAmountBaseUnits > Number.MAX_SAFE_INTEGER) {
      throw new Error('Token amount too large');
    }
    
    // Serialize: discriminator (8) + token_amount (8) = 16 bytes total
const dataArray = new Uint8Array(16);

// Copy discriminator bytes
const discriminator = [114, 242, 25, 12, 62, 126, 92, 2];
for (let i = 0; i < 8; i++) {
  dataArray[i] = discriminator[i];
}

// Write u64 token amount as two u32 values (little endian)
const tokenLow = tokenAmountBaseUnits & 0xFFFFFFFF;
const tokenHigh = Math.floor(tokenAmountBaseUnits / 0x100000000);

// Manually write u32 in little endian at position 8
dataArray[8] = tokenLow & 0xFF;
dataArray[9] = (tokenLow >> 8) & 0xFF;
dataArray[10] = (tokenLow >> 16) & 0xFF;
dataArray[11] = (tokenLow >> 24) & 0xFF;

// Manually write u32 in little endian at position 12
dataArray[12] = tokenHigh & 0xFF;
dataArray[13] = (tokenHigh >> 8) & 0xFF;
dataArray[14] = (tokenHigh >> 16) & 0xFF;
dataArray[15] = (tokenHigh >> 24) & 0xFF;

const data = Buffer.from(dataArray);

console.log('📦 Data buffer length:', data.length);
console.log('📦 Data buffer:', Array.from(data));
    
    console.log('🔍 Creating instruction...');
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: bondingCurve, isSigner: false, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: true },
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: BONDING_CURVE_PROGRAM_ID,
      data,
    });
    
    console.log('🔍 Building transaction...');
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    
    console.log('🔍 Signing transaction...');
    const signed = await wallet.signTransaction(transaction);
    
    console.log('🔍 Sending transaction...');
    const txid = await connection.sendRawTransaction(signed.serialize());
    
    console.log('🔍 Confirming transaction...');
    await connection.confirmTransaction(txid, 'confirmed');
    
    console.log('✅ Tokens sold!');
    console.log('📝 TX:', txid);
    
    return txid;
  } catch (error: any) {
    console.error('❌ Sell tokens error:', error);
    if (error.logs) {
      console.error('Transaction logs:', error.logs);
    }
    throw error;
  }
}