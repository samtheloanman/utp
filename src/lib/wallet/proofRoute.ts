import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabaseAuth/requireUser';
import { createSupabaseWalletLinkStore } from './store';
import type { WalletLinkStore } from './walletLink';

type Action = (
  i: { userId: string; message: string; signature: `0x${string}`; origin: string },
  store: WalletLinkStore,
) => Promise<{ ok: true } | { ok: false; reason: string }>;

/**
 * Shared POST handler for wallet-proof routes (link, unlink). Fails closed
 * with 503 when WALLET_LINK_SECRET is unset; never echoes failure reasons.
 * `conflict` maps one reason to 409; every other failure is 400.
 */
export async function handleWalletProof(req: Request, action: Action, conflict?: string): Promise<Response> {
  const secret = process.env.WALLET_LINK_SECRET;
  if (!secret) return NextResponse.json({ ok: false }, { status: 503 });

  const auth = await requireUser(req);
  if ('error' in auth) return auth.error;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { message, signature } = (body ?? {}) as { message?: unknown; signature?: unknown };
  if (
    typeof message !== 'string' ||
    message.length > 4096 ||
    typeof signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(signature)
  ) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // Domain and URI come from the request URL, never from the client.
  const origin = new URL(req.url).origin;
  try {
    const store = createSupabaseWalletLinkStore(auth.accessToken, auth.user.id, secret);
    const r = await action({ userId: auth.user.id, message, signature: signature as `0x${string}`, origin }, store);
    if (r.ok) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: false }, { status: conflict && r.reason === conflict ? 409 : 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
