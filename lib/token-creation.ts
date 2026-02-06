import { Connection, PublicKey, Transaction, TransactionInstruction, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import BN from 'bn.js';

const TOKEN_FACTORY_PROGRAM_ID = new PublicKey('7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX');
const BONDING_CURVE_PROGRAM_ID = new PublicKey('76SBTzzjPquPkiH6E9rj31eyQKkBjx1x7uDPHkw5UgwJ');

// Instruction discriminator from IDL
const CREATE_TOKEN_DISCRIMINATOR = Buffer.from([84, 52, 204, 228, 24, 140, 234, 75]);

export async function createTokenManual(
  connection: Connection,
  wallet: any,
  params: {
    name: string;
    symbol: string;
    uri: string;
    tier: 'free' | 'premium';
    category: 'meme' | 'ai' | 'gaming' | 'defi' | 'nft' | 'other';
    launchDelay: number;
    antiBotEnabled: boolean;
  }
) {
  // Convert enums to numbers
  const tierNum = params.tier === 'free' ? 0 : 1;
  const categoryMap: Record<string, number> = {
    meme: 0,
    ai: 1,
    gaming: 2,
    defi: 3,
    nft: 4,
    other: 5,
  };
  const categoryNum = categoryMap[params.category];

  // Manually serialize the instruction data
  const nameBuffer = Buffer.from(params.name);
  const symbolBuffer = Buffer.from(params.symbol);
  const uriBuffer = Buffer.from(params.uri);
  
  // Calculate total size
  const dataSize = 
    8 + // discriminator
    4 + nameBuffer.length + // string length + data
    4 + symbolBuffer.length + // string length + data
    4 + uriBuffer.length + // string length + data
    1 + // tier (u8)
    1 + // category (u8)
    8 + // launchDelay (i64)
    1;  // antiBotEnabled (bool)
  
  const data = Buffer.alloc(dataSize);
  let offset = 0;
  
  // Write discriminator
  CREATE_TOKEN_DISCRIMINATOR.copy(data, offset);
  offset += 8;
  
  // Write name (string: u32 length + bytes)
  data.writeUInt32LE(nameBuffer.length, offset);
  offset += 4;
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;
  
  // Write symbol
  data.writeUInt32LE(symbolBuffer.length, offset);
  offset += 4;
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;
  
  // Write uri
  data.writeUInt32LE(uriBuffer.length, offset);
  offset += 4;
  uriBuffer.copy(data, offset);
  offset += uriBuffer.length;
  
  // Write tier (u8)
  data.writeUInt8(tierNum, offset);
  offset += 1;
  
  // Write category (u8)
  data.writeUInt8(categoryNum, offset);
  offset += 1;
  
  // Write launchDelay (i64)
  const launchDelayLow = params.launchDelay & 0xFFFFFFFF;
  const launchDelayHigh = Math.floor(params.launchDelay / 0x100000000);
  data.writeUInt32LE(launchDelayLow, offset);
  data.writeUInt32LE(launchDelayHigh, offset + 4);
  offset += 8;
  
  // Write antiBotEnabled (bool)
  data.writeUInt8(params.antiBotEnabled ? 1 : 0, offset);

  console.log('📝 Instruction data:', data.toString('hex'));

  // Generate mint keypair
  const mintKeypair = Keypair.generate();
  console.log('🔑 Mint:', mintKeypair.publicKey.toBase58());

  // Derive PDAs
  const [globalState] = PublicKey.findProgramAddressSync(
    [Buffer.from('global-state')],
    TOKEN_FACTORY_PROGRAM_ID
  );

  const [tokenMetadata] = PublicKey.findProgramAddressSync(
    [Buffer.from('token-metadata'), mintKeypair.publicKey.toBuffer()],
    TOKEN_FACTORY_PROGRAM_ID
  );

  const [bondingCurve] = PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mintKeypair.publicKey.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );

  // Get associated token account for bonding curve
  const bondingCurveTokenAccount = await getAssociatedTokenAddress(
    mintKeypair.publicKey,
    bondingCurve,
    true // allowOwnerOffCurve
  );

  console.log('📍 PDAs:');
  console.log('  Global State:', globalState.toBase58());
  console.log('  Token Metadata:', tokenMetadata.toBase58());
  console.log('  Mint:', mintKeypair.publicKey.toBase58());
  console.log('  Bonding Curve:', bondingCurve.toBase58());
  console.log('  BC Token Account:', bondingCurveTokenAccount.toBase58());

  // Create instruction with all required accounts
  const instruction = new TransactionInstruction({
    keys: [
      { pubkey: globalState, isSigner: false, isWritable: true },
      { pubkey: tokenMetadata, isSigner: false, isWritable: true },
      { pubkey: mintKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: bondingCurve, isSigner: false, isWritable: false },
      { pubkey: bondingCurveTokenAccount, isSigner: false, isWritable: true },
      { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
      { pubkey: BONDING_CURVE_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    programId: TOKEN_FACTORY_PROGRAM_ID,
    data: data,
  });

  console.log('📦 Creating transaction...');

  // Create and send transaction
  const transaction = new Transaction().add(instruction);
  transaction.feePayer = wallet.publicKey;
  
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;

  // Sign with mint keypair
  transaction.partialSign(mintKeypair);

  console.log('✍️ Signing transaction...');

  // Sign and send with wallet
  const signed = await wallet.signTransaction(transaction);
  
  console.log('📡 Sending transaction...');
  
  const txid = await connection.sendRawTransaction(signed.serialize());
  
  console.log('⏳ Confirming transaction...');
  
  await connection.confirmTransaction(txid, 'confirmed');

  console.log('✅ Transaction confirmed!');
  console.log('🪙 Real SPL tokens minted!');

  return {
    signature: txid,
    mint: mintKeypair.publicKey.toBase58(),
    bondingCurve: bondingCurve.toBase58(),
  };
}