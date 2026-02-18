import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import crypto from 'crypto';

const SOCIAL_REGISTRY_PROGRAM_ID = new PublicKey('K3Fp6EiRsECtYbj63aG52D7rn2DiJdaLaxnN8MFpprh');

export enum SocialPlatform {
  Twitter = 0,
  Telegram = 1,
  Discord = 2,
  Website = 3,
}

export function generateVerificationCode(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 char hex string
}

export async function registerSocial(
  connection: Connection,
  wallet: any,
  tokenMint: string,
  platform: SocialPlatform,
  handle: string,
  verificationCode: string,
) {
  try {
    const mintPubkey = new PublicKey(tokenMint);
    
    // Derive PDA
    const [socialRegistryPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('social-registry'),
        mintPubkey.toBuffer(),
        Buffer.from([platform]),
      ],
      SOCIAL_REGISTRY_PROGRAM_ID
    );
    
    // Encode strings
    const handleBuffer = Buffer.from(handle, 'utf8');
    const handleLengthBuffer = Buffer.alloc(4);
    handleLengthBuffer.writeUInt32LE(handleBuffer.length);
    
    const codeBuffer = Buffer.from(verificationCode, 'utf8');
    const codeLengthBuffer = Buffer.alloc(4);
    codeLengthBuffer.writeUInt32LE(codeBuffer.length);
    
    // Create instruction data
    const instructionData = Buffer.concat([
      Buffer.from([0x00]), // register_social discriminator (first byte)
      Buffer.from([platform]),
      handleLengthBuffer,
      handleBuffer,
      codeLengthBuffer,
      codeBuffer,
    ]);
    
    const instruction = {
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: false },
        { pubkey: socialRegistryPDA, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: SOCIAL_REGISTRY_PROGRAM_ID,
      data: instructionData,
    };
    
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    const signedTx = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txid, 'confirmed');
    
    console.log('✅ Social registered! TX:', txid);
    return { txid, verificationCode };
  } catch (error) {
    console.error('Error registering social:', error);
    throw error;
  }
}

export async function getSocialRegistry(
  connection: Connection,
  tokenMint: string,
  platform: SocialPlatform,
) {
  try {
    const mintPubkey = new PublicKey(tokenMint);
    
    const [socialRegistryPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('social-registry'),
        mintPubkey.toBuffer(),
        Buffer.from([platform]),
      ],
      SOCIAL_REGISTRY_PROGRAM_ID
    );
    
    const account = await connection.getAccountInfo(socialRegistryPDA);
    
    if (!account) return null;
    
    // Parse account data
    const data = account.data;
    const verified = data[127] === 1; // Approximate offset for verified boolean
    
    return {
      address: socialRegistryPDA.toBase58(),
      verified,
    };
  } catch (error) {
    return null;
  }
}