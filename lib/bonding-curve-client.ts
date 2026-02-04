import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';

const BONDING_CURVE_PROGRAM_ID = new PublicKey('FqjbzRkHvZ6kAQkXHR4aZ5EECrtXeMkJF46Di55na6Hq');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');

// Correct discriminators from IDL
const INITIALIZE_CURVE_DISCRIMINATOR = Buffer.from([170, 84, 186, 253, 131, 149, 95, 213]);
const BUY_TOKENS_DISCRIMINATOR = Buffer.from([189, 21, 230, 133, 247, 2, 110, 42]);

export async function initializeBondingCurve(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  treasuryAddress: string
) {
  const mint = new PublicKey(mintAddress);
  const treasury = new PublicKey(treasuryAddress);
  
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
  
  console.log('📍 Initializing bonding curve:', bondingCurve.toBase58());
  
  // Serialize: discriminator + mint (32 bytes) + treasury (32 bytes)
  const data = Buffer.alloc(8 + 32 + 32);
  INITIALIZE_CURVE_DISCRIMINATOR.copy(data, 0);
  mint.toBuffer().copy(data, 8);
  treasury.toBuffer().copy(data, 40);
  
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
  
  console.log('✅ Bonding curve initialized!');
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
  
  const [tokenMetadata] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-metadata'), mint.toBuffer()],
    TOKEN_FACTORY_PROGRAM_ID
  );
  
  const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
  if (!bondingCurveAccount) throw new Error('Bonding curve not found');
  
  const treasury = new PublicKey(bondingCurveAccount.data.slice(40, 72));
  
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
      { pubkey: tokenMetadata, isSigner: false, isWritable: false },
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
  
  return txid;
}

export async function sellTokens(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  tokenAmount: number // in whole tokens (not base units)
) {
  const mint = new PublicKey(mintAddress);
  
  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
  
  const bondingCurveAccount = await connection.getAccountInfo(bondingCurve);
  if (!bondingCurveAccount) throw new Error('Bonding curve not found');
  
  const treasury = new PublicKey(bondingCurveAccount.data.slice(40, 72));
  
  console.log('💸 Selling', tokenAmount, 'tokens');
  
  // Validate token amount
  if (tokenAmount <= 0 || !Number.isFinite(tokenAmount)) {
    throw new Error('Invalid token amount');
  }
  
  // Correct sell_tokens discriminator
  const SELL_TOKENS_DISCRIMINATOR = Buffer.from([114, 242, 25, 12, 62, 126, 92, 2]);
  
  // Convert tokens to base units (6 decimals) - with safety check
  const tokenAmountBaseUnits = Math.floor(tokenAmount * 1_000_000);
  
  // Check if number is too large for u64
  if (tokenAmountBaseUnits > Number.MAX_SAFE_INTEGER) {
    throw new Error('Token amount too large');
  }
  
  // Serialize: discriminator + token_amount (u64)
  const data = Buffer.alloc(16); // 8 for discriminator + 8 for u64
  SELL_TOKENS_DISCRIMINATOR.copy(data, 0);
  
  // Write u64 safely
  const tokenLow = tokenAmountBaseUnits & 0xFFFFFFFF;
  const tokenHigh = Math.floor(tokenAmountBaseUnits / 0x100000000);
  data.writeUInt32LE(tokenLow, 8);
  data.writeUInt32LE(tokenHigh, 12);
  
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
  
  console.log('✅ Tokens sold!');
  console.log('📝 TX:', txid);
  
  return txid;
}