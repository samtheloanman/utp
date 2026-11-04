import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabaseAuth/requireUser';
import { createSupabaseWalletLinkStore } from '@/lib/wallet/store';
import { verifyWalletLink } from '@/lib/wallet/walletLink';

export async function POST(req: Request) {
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

  const origin = new URL(req.url).origin;
  try {
    const store = createSupabaseWalletLinkStore(auth.accessToken, auth.user.id);
    const r = await verifyWalletLink(
      { userId: auth.user.id, message, signature: signature as `0x${string}`, origin },
      store,
    );
    if (r.ok) return NextResponse.json({ ok: true });
    // Do not echo internal reasons beyond the conflict case.
    return NextResponse.json({ ok: false }, { status: r.reason === 'address_taken' ? 409 : 400 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
