import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction, 
  SystemProgram 
} from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

import { Buffer } from 'buffer';
// Now Buffer will have writeBigInt64LE available

const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');
const PLATFORM_WALLET = new PublicKey('GtcpcvS3k24MA3Yhs6bAd1spkdjYmx82KqRxSk6pPWhE'); 
const RENT_SYSVAR = new PublicKey('SysvarRent111111111111111111111111111111111');

export type BondingCurveState = {
  tokensSold: number;
  solCollected: number;
  progress: number;
  graduated: boolean;
};

async function retryAsync<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  throw lastError || new Error('Max retries exceeded');
}

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

  // BondingCurve struct offsets (with discriminator=8 bytes):
  // creator: 8-40 (32)
  // token_mint: 40-72 (32)
  // treasury: 72-104 (32)
  // total_supply: 104-112 (8)
  // tokens_sold: 112-120 (8) ← HERE
  // sol_collected: 120-128 (8) ← HERE
  // fees_collected: 128-136 (8)
  // ... more fields ...
  // graduated: 187 (1) ← bool

  const tokensSold = Number(data.readBigUInt64LE(112)) / 1_000_000_000; // 9 decimals
  const solCollected = Number(data.readBigUInt64LE(120)) / 1_000_000_000;
  const graduated = data[187] === 1; // graduated field

  const graduationThreshold = 81;
  const progress = (solCollected / graduationThreshold) * 100;

  return { tokensSold, solCollected, progress, graduated };
}

export async function getUserTokenBalance(
  connection: Connection,
  mintAddress: string,
  userPublicKey: PublicKey
): Promise<number> {
  try {
    const mint = new PublicKey(mintAddress);
    const ata = getAssociatedTokenAddressSync(mint, userPublicKey);
    
    const balance = await connection.getTokenAccountBalance(ata);
    return balance.value.uiAmount || 0;
  } catch (error) {
    return 0;
  }
}

export async function buyTokens(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  solAmount: number
) {
  const mint = new PublicKey(mintAddress);
  const buyer = wallet.publicKey;

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  const buyerAta = getAssociatedTokenAddressSync(mint, buyer);
  const curveAta = getAssociatedTokenAddressSync(mint, bondingCurve, true);

  const [userBalance] = PublicKey.findProgramAddressSync(
    [Buffer.from('user-balance'), bondingCurve.toBuffer(), buyer.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  console.log('💰 Buying tokens for', solAmount, 'SOL');

  const transaction = new Transaction();

  // Create buyer ATA if needed
  const buyerAtaInfo = await connection.getAccountInfo(buyerAta);
  if (!buyerAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        buyerAta,
        buyer,
        mint
      )
    );
  }

  // Build buy instruction
  const data = Buffer.alloc(16);
  Buffer.from([189, 21, 230, 133, 247, 2, 110, 42]).copy(data, 0);
  
  const lamports = Math.floor(solAmount * 1_000_000_000);
  data.writeBigUInt64LE(BigInt(lamports), 8);

  transaction.add(
  new TransactionInstruction({
    keys: [
      { pubkey: buyer, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: buyerAta, isSigner: false, isWritable: true },
      { pubkey: curveAta, isSigner: false, isWritable: true },
      { pubkey: userBalance, isSigner: false, isWritable: true },
      { pubkey: PLATFORM_WALLET, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
    ],
    programId: BONDING_CURVE_PROGRAM_ID,
    data,
  })
);

  transaction.feePayer = buyer;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid, 'confirmed');

  console.log('✅ Tokens bought! TX:', txid);
  return txid;
}

export async function devBuy(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  solAmount: number
) {
  const mint = new PublicKey(mintAddress);
  const buyer = wallet.publicKey;

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  const buyerAta = getAssociatedTokenAddressSync(mint, buyer);
  const curveAta = getAssociatedTokenAddressSync(mint, bondingCurve, true);

  const [userBalance] = PublicKey.findProgramAddressSync(
    [Buffer.from('user-balance'), bondingCurve.toBuffer(), buyer.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  console.log('👤 Dev buying tokens for', solAmount, 'SOL');

  const transaction = new Transaction();

  // Create buyer ATA if needed
  const buyerAtaInfo = await connection.getAccountInfo(buyerAta);
  if (!buyerAtaInfo) {
    transaction.add(
      createAssociatedTokenAccountInstruction(
        buyer,
        buyerAta,
        buyer,
        mint
      )
    );
  }

  // Build dev_buy instruction
  const data = Buffer.alloc(16);
  Buffer.from([204, 237, 9, 67, 164, 234, 146, 78]).copy(data, 0);
  
  const lamports = Math.floor(solAmount * 1_000_000_000);
  data.writeBigUInt64LE(BigInt(lamports), 8);

  transaction.add(
    new TransactionInstruction({
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: bondingCurve, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: true },
        { pubkey: buyerAta, isSigner: false, isWritable: true },
        { pubkey: curveAta, isSigner: false, isWritable: true },
        { pubkey: userBalance, isSigner: false, isWritable: true },
        { pubkey: PLATFORM_WALLET, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
      ],
      programId: BONDING_CURVE_PROGRAM_ID,
      data,
    })
  );

  transaction.feePayer = buyer;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid, 'confirmed');

  console.log('✅ Dev bought tokens! TX:', txid);
  return txid;
}

export async function sellTokens(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  tokenAmount: number
) {
  const mint = new PublicKey(mintAddress);
  const seller = wallet.publicKey;

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  const sellerAta = getAssociatedTokenAddressSync(mint, seller);
  const curveAta = getAssociatedTokenAddressSync(mint, bondingCurve, true);

  const [userBalance] = PublicKey.findProgramAddressSync(
    [Buffer.from('user-balance'), bondingCurve.toBuffer(), seller.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  console.log('💸 Selling', tokenAmount, 'tokens');

  const data = Buffer.alloc(16);
  Buffer.from([114, 242, 25, 12, 62, 126, 92, 2]).copy(data, 0);
  
  const tokenAmountRaw = Math.floor(tokenAmount * 1_000_000); // 6 decimals
  data.writeBigUInt64LE(BigInt(tokenAmountRaw), 8);

  const transaction = new Transaction().add(
    new TransactionInstruction({
      keys: [
      { pubkey: seller, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
      { pubkey: sellerAta, isSigner: false, isWritable: true },
      { pubkey: curveAta, isSigner: false, isWritable: true },
      { pubkey: userBalance, isSigner: false, isWritable: true },
      { pubkey: PLATFORM_WALLET, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
      ],
      programId: BONDING_CURVE_PROGRAM_ID,
      data,
    })
  );

  transaction.feePayer = seller;
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  const signed = await wallet.signTransaction(transaction);
  const txid = await connection.sendRawTransaction(signed.serialize());
  await connection.confirmTransaction(txid, 'confirmed');

  console.log('✅ Tokens sold! TX:', txid);
  return txid;
}

// Placeholder - will be replaced by token factory
export async function initializeBondingCurve(
  connection: Connection,
  wallet: any,
  mintAddress: string,
  treasuryAddress: string,
  isPremium: boolean,
  launchDelay: number,
  enableAntiBot: boolean
) {
  try {
    const mint = new PublicKey(mintAddress);
    const treasury = new PublicKey(treasuryAddress);
    const creator = wallet.publicKey;

    // Get PDA for bonding curve
    const [bondingCurve, bump] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mint.toBuffer()],
      BONDING_CURVE_PROGRAM_ID
    );

    console.log('📍 Initializing bonding curve:', bondingCurve.toBase58());
    console.log('📊 Bump seed:', bump);

    // ========== CRITICAL: CHECK IF ACCOUNT ALREADY EXISTS ==========
const existingAccount = await connection.getAccountInfo(bondingCurve);
if (existingAccount) {
  console.log('⚠️ Account already exists!');
  
  // Check discriminator
  const expectedDiscriminator = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);
  const actualDiscriminator = existingAccount.data.slice(0, 8);
  
  if (actualDiscriminator.equals(expectedDiscriminator)) {
    console.log('✅ Account already properly initialized');
    return { 
      success: true, 
      existing: true, 
      bondingCurve: bondingCurve.toBase58(),
      message: 'Bonding curve already initialized'
    };
  } else {
    // Account exists with wrong data (including all zeros)
    console.log('❌ Account exists with incompatible data');
    throw new Error(
      `This token already has a bonding curve account that cannot be reused. ` +
      `Please create a token with a different name/symbol.`
    );
  }
}

// Account doesn't exist - good to proceed
console.log('✅ No existing account found, proceeding with initialization');

    // Derive the bonding curve's token account
    const curveAta = getAssociatedTokenAddressSync(mint, bondingCurve, true);

    // ========== CREATE INSTRUCTION DATA ==========
    const data = Buffer.alloc(8 + 32 + 32 + 1 + 8 + 1); // 82 bytes
    
    // 1. Instruction discriminator for "initialize_curve"
    Buffer.from([170, 84, 186, 253, 131, 149, 95, 213]).copy(data, 0);
    
    // 2. mint (Pubkey - 32 bytes)
    mint.toBuffer().copy(data, 8);
    
    // 3. treasury (Pubkey - 32 bytes)
    treasury.toBuffer().copy(data, 40);
    
    // 4. is_premium (bool - 1 byte)
    data.writeUInt8(isPremium ? 1 : 0, 72);
    
    // 5. launch_delay (i64 - 8 bytes)
    const launchDelayBigInt = BigInt(launchDelay);
    const dataView = new DataView(data.buffer, data.byteOffset + 73, 8);
    dataView.setBigInt64(0, launchDelayBigInt, true);
    
    // 6. enable_anti_bot (bool - 1 byte)
    data.writeUInt8(enableAntiBot ? 1 : 0, 81);

    console.log('📝 Instruction data prepared:');
    console.log('   Discriminator:', data.slice(0, 8).toString('hex'));
    console.log('   Mint:', mint.toBase58());
    console.log('   Treasury:', treasury.toBase58());
    console.log('   is_premium:', isPremium);
    console.log('   launch_delay:', launchDelay, '(hex:', data.slice(73, 81).toString('hex') + ')');
    console.log('   enable_anti_bot:', enableAntiBot);

// ========== CREATE TRANSACTION ==========
const instruction = new TransactionInstruction({
  keys: [
    { pubkey: creator, isSigner: true, isWritable: true },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: RENT_SYSVAR, isSigner: false, isWritable: false },
  ],
  programId: BONDING_CURVE_PROGRAM_ID,
  data,
});

const transaction = new Transaction().add(instruction);
transaction.feePayer = creator;

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;

 // ========== SEND TRANSACTION WITH PROPER ERROR HANDLING ==========
console.log('📤 Sending transaction...');

try {
  const signed = await wallet.signTransaction(transaction);
  
  // Try to send with preflight enabled to catch simulation errors
  const txid = await connection.sendRawTransaction(signed.serialize(), {
    skipPreflight: false, // Enable preflight to catch errors early
    preflightCommitment: 'confirmed',
    maxRetries: 3,
  });
  
  console.log('⏳ Waiting for confirmation... TX:', txid);
  
  const confirmation = await connection.confirmTransaction({
    signature: txid,
    blockhash,
    lastValidBlockHeight,
  }, 'confirmed');

  if (confirmation.value.err) {
    throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
  }

  console.log('✅ Bonding curve initialized!');
  console.log('📝 TX:', txid);
  
  // Wait a bit for indexing
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Verify the account was created correctly
  const newAccount = await connection.getAccountInfo(bondingCurve);
  if (newAccount) {
    const discriminator = newAccount.data.slice(0, 8);
    console.log('✅ Account verified! Discriminator:', discriminator);
  }
  
  return { 
    success: true, 
    txid, 
    bondingCurve: bondingCurve.toBase58(),
    message: 'Bonding curve initialized successfully'
  };
  
} catch (sendError: any) {
  console.error('❌ Transaction send failed:', sendError);
  
  // Check for simulation error logs
  if (sendError.logs) {
    console.error('📋 Simulation logs:', sendError.logs);
  }
  
  // Parse the error message
  const errorMessage = sendError.message || '';
  const errorLogs = sendError.logs || [];
  
  // Check for Anchor Error 3003 - AccountDidNotDeserialize
  const isAccountDidNotDeserialize = 
    errorMessage.includes('custom program error: 0xbbb') ||
    errorMessage.includes('Error Code: AccountDidNotDeserialize') ||
    errorMessage.includes('Error Number: 3003') ||
    JSON.stringify(sendError).includes('{"Custom":3003}') ||
    errorLogs.some((log: string) => 
      log.includes('AccountDidNotDeserialize') || 
      log.includes('custom program error: 0xbbb')
    );

  if (isAccountDidNotDeserialize) {
    console.log('⚠️ Detected AccountDidNotDeserialize error (0xbbb)');
    
    // Check if the account exists (it should, since we got this error)
    const accountCheck = await connection.getAccountInfo(bondingCurve);
    if (accountCheck) {
      console.log('📊 Account exists with size:', accountCheck.data.length);
      console.log('📝 Discriminator:', accountCheck.data.slice(0, 8));
    }
    
    // Return a specific error that the UI can handle
    const error = new Error(
      `Bonding curve account already exists with wrong data. ` +
      `Please create a new token with a different name/symbol.`
    );
    (error as any).code = 'ACCOUNT_DID_NOT_DESERIALIZE';
    (error as any).customErrorCode = 3003;
    throw error;
  }
  
  // Re-throw other errors
  throw sendError;
}
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    throw error;
  }
}

export async function releaseDevTokens(
  connection: Connection,
  wallet: any,
  mintAddress: string
) {
  try {
    console.log('🎁 Claiming dev tokens for:', mintAddress);
    
    const mintPubkey = new PublicKey(mintAddress);
    
    // Derive bonding curve PDA
    const [bondingCurvePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('bonding-curve'), mintPubkey.toBuffer()],
      BONDING_CURVE_PROGRAM_ID
    );
    
    // Get token accounts
    const bondingCurveTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      bondingCurvePDA,
      true
    );
    
    const creatorTokenAccount = getAssociatedTokenAddressSync(
      mintPubkey,
      wallet.publicKey
    );
    
    // Create instruction data (release_dev_tokens discriminator)
    const instructionData = Buffer.from([
      0x4a, 0x55, 0x8c, 0x6d, 0x3f, 0x7e, 0x1a, 0x9b // release_dev_tokens discriminator
    ]);
    
    const instruction = {
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true }, // creator
        { pubkey: bondingCurvePDA, isSigner: false, isWritable: true }, // bonding_curve
        { pubkey: mintPubkey, isSigner: false, isWritable: true }, // token_mint
        { pubkey: bondingCurveTokenAccount, isSigner: false, isWritable: true }, // bonding_curve_token_account
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true }, // creator_token_account
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system_program
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // token_program
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false }, // associated_token_program
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }, // rent
      ],
      programId: BONDING_CURVE_PROGRAM_ID,
      data: instructionData,
    };
    
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const signedTx = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txid, 'confirmed');
    
    console.log('✅ Dev tokens claimed! TX:', txid);
    return txid;
    
  } catch (error) {
    console.error('❌ Error claiming dev tokens:', error);
    throw error;
  }
}