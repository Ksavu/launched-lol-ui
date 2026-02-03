import { Connection, PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';

const BONDING_CURVE_PROGRAM_ID = new PublicKey('FqjbzRkHvZ6kAQkXHR4aZ5EECrtXeMkJF46Di55na6Hq');
const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');

// Correct discriminators from IDL
const INITIALIZE_CURVE_DISCRIMINATOR = Buffer.from([170, 84, 186, 253, 131, 149, 95, 213]);
const BUY_TOKENS_DISCRIMINATOR = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

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
  data.writeBigUInt64LE(BigInt(lamports), 8);
  
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