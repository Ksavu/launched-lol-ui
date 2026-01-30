import { Program, AnchorProvider, BN } from '@coral-xyz/anchor';
import { WalletContextState } from '@solana/wallet-adapter-react';
import {
  Connection,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Keypair
} from '@solana/web3.js';

// --- Import IDL ---
import * as TokenFactoryJson from './idl/token_factory.json';

// --- Unwrap default if present ---
const TokenFactoryIDL = (TokenFactoryJson as any).default ?? (TokenFactoryJson as any);

// --- Program ID ---
export const TOKEN_FACTORY_PROGRAM_ID = new PublicKey(
  '7F4JYKAEs7VhVd9P8E1wHhd8aiwtKYeo1tTxabDqpCvX'
);

// --- Provider ---
export const getProvider = (connection: Connection, wallet: WalletContextState) => {
  return new AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
};

// --- Program Instance ---
export const getTokenFactoryProgram = (provider: AnchorProvider) => {
  // ⚠ Important: cast to 'any' but also pass unwrapped IDL
  return new Program(TokenFactoryIDL as any, TOKEN_FACTORY_PROGRAM_ID, provider);
};

// --- PDAs ---
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
  const BONDING_CURVE_PROGRAM_ID = new PublicKey(
    'FqjbzRkHvZ6kAQkXHR4aZ5EECrtXeMkJF46Di55na6Hq'
  );
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bonding-curve'), mint.toBuffer()],
    BONDING_CURVE_PROGRAM_ID
  );
};

// --- Create Token ---
export interface CreateTokenParams {
  name: string;
  symbol: string;
  uri: string;
  tier: 'Free' | 'Premium';       // Match JSON enum exactly!
  category: 'Meme' | 'AI' | 'Gaming' | 'DeFi' | 'NFT' | 'Other';
  launchDelay: number;
  antiBotEnabled: boolean;
}

export const createToken = async (
  provider: AnchorProvider,
  params: CreateTokenParams
) => {
  const program = getTokenFactoryProgram(provider);
  const mintKeypair = Keypair.generate();

  const [globalState] = getGlobalStatePDA();
  const [tokenMetadata] = getTokenMetadataPDA(mintKeypair.publicKey);
  const [bondingCurve] = getBondingCurvePDA(mintKeypair.publicKey);

  // Borsh enum format: discriminator + empty object
  const tierEnum = params.tier === 'Free' ? { Free: {} } : { Premium: {} };

  const categoryEnum: any = { [params.category]: {} };

  try {
    const tx = await (program.methods as any).create_token(
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

    console.log('✅ Token created!', tx);

    return {
      success: true,
      signature: tx,
      mint: mintKeypair.publicKey.toBase58(),
      bondingCurve: bondingCurve.toBase58(),
    };
  } catch (err: any) {
    console.error('❌ Failed to create token:', err);
    throw err;
  }
};
