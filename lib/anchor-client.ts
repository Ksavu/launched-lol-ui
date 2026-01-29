import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, Keypair } from '@solana/web3.js';
import TokenFactoryIDL from './idl/token_factory.json';
import BondingCurveIDL from './idl/bonding_curve.json';

export const TOKEN_FACTORY_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TOKEN_FACTORY_PROGRAM!
);

export const BONDING_CURVE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_BONDING_CURVE_PROGRAM!
);

export const getProvider = (connection: Connection, wallet: WalletContextState) => {
  return new AnchorProvider(
    connection,
    wallet as any,
    { commitment: 'confirmed' }
  );
};

export const getTokenFactoryProgram = (provider: AnchorProvider) => {
  return new Program(TokenFactoryIDL as any, TOKEN_FACTORY_PROGRAM_ID, provider);
};

export const getBondingCurveProgram = (provider: AnchorProvider) => {
  return new Program(BondingCurveIDL as any, BONDING_CURVE_PROGRAM_ID, provider);
};

export const getGlobalStatePDA = () => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('global-state')],
    TOKEN_FACTORY_PROGRAM_ID
  );
};

export const getTokenMetadataPDA = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('token-metadata'), mint.toBuffer()],
    TOKEN_FACTORY_PROGRAM_ID
  );
};

export const getBondingCurvePDA = (mint: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
};

export interface CreateTokenParams {
  name: string;
  symbol: string;
  uri: string;
  tier: 'free' | 'premium';
  category: 'meme' | 'ai' | 'gaming' | 'defi' | 'nft' | 'other';
  launchDelay: number;
  antiBotEnabled: boolean;
  treasuryWallet: PublicKey;
}

export const createToken = async (
  provider: AnchorProvider,
  params: CreateTokenParams
) => {
  const tokenFactoryProgram = getTokenFactoryProgram(provider);
  
  // Generate new mint keypair
  const mintKeypair = Keypair.generate();
  
  // Get PDAs
  const [globalState] = getGlobalStatePDA();
  const [tokenMetadata] = getTokenMetadataPDA(mintKeypair.publicKey);
  const [bondingCurve] = getBondingCurvePDA(mintKeypair.publicKey);
  
  // Convert tier to enum format
  const tierEnum = params.tier === 'free' ? { free: {} } : { premium: {} };
  
  // Convert category to enum format
  const categoryEnum = { [params.category]: {} };
  
  console.log('Creating token with params:', {
    mint: mintKeypair.publicKey.toBase58(),
    globalState: globalState.toBase58(),
    tokenMetadata: tokenMetadata.toBase58(),
    bondingCurve: bondingCurve.toBase58(),
    tier: tierEnum,
    category: categoryEnum,
  });
  
  try {
    const tx = await tokenFactoryProgram.methods
      .createToken(
        params.name,
        params.symbol,
        params.uri,
        tierEnum,
        categoryEnum,
        new BN(params.launchDelay),
        params.antiBotEnabled
      )
      .accounts({
        globalState,
        tokenMetadata,
        mint: mintKeypair.publicKey,
        bondingCurve,
        creator: provider.wallet.publicKey,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .signers([mintKeypair])
      .rpc();
    
    console.log('Token created! TX:', tx);
    
    return {
      success: true,
      signature: tx,
      mint: mintKeypair.publicKey.toBase58(),
      bondingCurve: bondingCurve.toBase58(),
    };
    
  } catch (error: any) {
    console.error('Token creation error:', error);
    throw new Error(error.message || 'Failed to create token');
  }
};