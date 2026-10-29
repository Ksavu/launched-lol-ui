import { NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { RPC_URL } from '../../../../../lib/rpc';

const connection = new Connection(RPC_URL, 'confirmed');
const SOCIAL_REGISTRY_PROGRAM_ID = new PublicKey('K3Fp6EiRsECtYbj63aG52D7rn2DiJdaLaxnN8MFpprh');
const PLATFORM_NAMES = ['Twitter', 'Telegram', 'Discord', 'Website'];

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mint: string }> }
) {
  try {
    const { mint } = await params;
    const mintKey = new PublicKey(mint);

    const verified: string[] = [];
    let pending = false;

    for (let platform = 0; platform < PLATFORM_NAMES.length; platform++) {
      const [pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('social-registry'), mintKey.toBuffer(), Buffer.from([platform])],
        SOCIAL_REGISTRY_PROGRAM_ID
      );
      const account = await connection.getAccountInfo(pda);
      if (!account) continue;
      if (account.data[127] === 1) verified.push(PLATFORM_NAMES[platform]);
      else pending = true;
    }

    return NextResponse.json({
      verified: verified.length > 0,
      pending: verified.length === 0 && pending,
      platforms: verified,
    });
  } catch {
    return NextResponse.json({ verified: false, pending: false, platforms: [] });
  }
}
