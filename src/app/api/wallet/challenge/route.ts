import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabaseAuth/requireUser';
import { createSupabaseWalletLinkStore } from '@/lib/wallet/store';
import {
  createWalletChallenge,
  DEFAULT_LINK_CHAIN_ID,
  isAllowedLinkChain,
  normalizeAddress,
} from '@/lib/wallet/walletLink';

export async function POST(req: Request) {
  const secret = process.env.WALLET_LINK_SECRET;
  if (!secret) return NextResponse.json({ message: 'Wallet linking is not configured' }, { status: 503 });
  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 });
  }
  const { address, chainId } = (body ?? {}) as { address?: unknown; chainId?: unknown };
  if (typeof address !== 'string') return NextResponse.json({ message: 'Invalid address' }, { status: 400 });
  try {
    normalizeAddress(address);
  } catch {
    return NextResponse.json({ message: 'Invalid address' }, { status: 400 });
  }
  const resolvedChainId = chainId === undefined ? DEFAULT_LINK_CHAIN_ID : chainId;
  if (typeof resolvedChainId !== 'number' || !isAllowedLinkChain(resolvedChainId)) {
    return NextResponse.json({ message: 'Unsupported chain' }, { status: 400 });
  }

  // Domain and URI come from the request URL, never from the client body.
  const origin = new URL(req.url).origin;
  try {
    const store = createSupabaseWalletLinkStore(auth.accessToken, auth.user.id, secret);
    const c = await createWalletChallenge({ userId: auth.user.id, address, chainId: resolvedChainId, origin }, store);
    return NextResponse.json(c);
  } catch {
    return NextResponse.json({ message: 'Could not create challenge' }, { status: 500 });
  }
}
