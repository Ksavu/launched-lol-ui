import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';

const BONDING_CURVE_PROGRAM_ID = new PublicKey('21ACVywCBCgrgAx8HpLJM6mJC8pxMzvvi58in5Xv7qej');
const PLATFORM_WALLET = new PublicKey('GtcpcvS3k24MA3Yhs6bAd1spkdjYmx82KqRxSk6pPWhE');

export async function graduateToken(
  connection: Connection,
  wallet: any,
  mintAddress: string
) {
  try {
    console.log('🎓 Graduating token:', mintAddress);
    
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
    
    // Create instruction data
    const instructionData = Buffer.from([
      0x9d, 0x4b, 0x8f, 0x3e, 0x5a, 0x7c, 0x1b, 0x2a // graduate_token discriminator
    ]);
    
    // Build transaction
    const instruction = {
      keys: [
        { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: bondingCurvePDA, isSigner: false, isWritable: true },
        { pubkey: mintPubkey, isSigner: false, isWritable: true },
        { pubkey: bondingCurveTokenAccount, isSigner: false, isWritable: true },
        { pubkey: creatorTokenAccount, isSigner: false, isWritable: true },
        { pubkey: PLATFORM_WALLET, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
      ],
      programId: BONDING_CURVE_PROGRAM_ID,
      data: instructionData,
    };
    
    const transaction = new Transaction().add(instruction);
    transaction.feePayer = wallet.publicKey;
    transaction.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    
    // Sign and send
    const signedTx = await wallet.signTransaction(transaction);
    const txid = await connection.sendRawTransaction(signedTx.serialize());
    await connection.confirmTransaction(txid, 'confirmed');
    
    console.log('✅ Token graduated! TX:', txid);
    return txid;
    
  } catch (error) {
    console.error('❌ Graduation error:', error);
    throw error;
  }
}