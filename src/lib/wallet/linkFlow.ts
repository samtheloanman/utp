export type LinkResult = { ok: true } | { ok: false; message: string };

const JSON_HEADERS = { 'Content-Type': 'application/json' };

/**
 * Browser side of wallet linking: ask the server for a sign-in message, have
 * the wallet sign it, send the signature back. The session cookie identifies
 * the account, so no token is passed here.
 */
export async function linkWallet(i: {
  address: string;
  chainId: number;
  signMessage: (message: string) => Promise<string>;
  fetch?: typeof fetch;
}): Promise<LinkResult> {
  const f = i.fetch ?? fetch;
  const fail = (message: string): LinkResult => ({ ok: false, message });
  try {
    const c = await f('/api/wallet/challenge', {
      method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ address: i.address, chainId: i.chainId }),
    });
    if (c.status === 401) return fail('Sign in first, then link your wallet.');
    if (c.status === 503) return fail('Wallet linking is not switched on yet.');
    if (!c.ok) return fail('Could not start wallet linking.');
    const { message } = (await c.json()) as { message: string };

    let signature: string;
    try {
      signature = await i.signMessage(message);
    } catch {
      return fail('The signature request was cancelled.');
    }

    const l = await f('/api/wallet/link', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ message, signature }) });
    if (l.status === 409) return fail('This wallet is already linked to another account.');
    if (!l.ok) return fail('The wallet could not be linked.');
    return { ok: true };
  } catch {
    return fail('The wallet could not be linked.');
  }
}
