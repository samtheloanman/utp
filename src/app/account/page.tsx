'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAccount, useConnect, useSignMessage } from 'wagmi';
import { createClient } from '@/lib/supabaseAuth/client';
import { linkWallet } from '@/lib/wallet/linkFlow';

const LINK_CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID || 31); // Rootstock testnet unless configured

interface WalletLink {
  address: string;
  chain_id: number;
}

export default function AccountPage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { signMessageAsync } = useSignMessage();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [links, setLinks] = useState<WalletLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);

  const loadLinks = useCallback(async () => {
    const { data } = await createClient().from('wallet_links').select('address,chain_id').eq('status', 'active');
    setLinks((data as WalletLink[] | null) ?? []);
  }, []);

  useEffect(() => {
    let active = true;
    createClient().auth.getSession().then(({ data }) => {
      if (!active) return;
      setSignedIn(Boolean(data.session));
      if (data.session) void loadLinks();
    }).catch(() => { if (active) setSignedIn(false); });
    return () => { active = false; };
  }, [loadLinks]);

  const link = async () => {
    if (!address || busy) return;
    setBusy(true);
    setNote(null);
    const r = await linkWallet({ address, chainId: LINK_CHAIN_ID, signMessage: (message) => signMessageAsync({ message }) });
    setNote(r.ok ? { ok: true, text: 'Wallet linked to your account.' } : { ok: false, text: r.message });
    if (r.ok) await loadLinks();
    setBusy(false);
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Your account</h1>
      {signedIn === false && (
        <p><Link href="/login?redirect=/account">Sign in</Link> to link a wallet.</p>
      )}
      {signedIn && (
        <>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem' }}>Linked wallets</h2>
          {links.length === 0 ? <p>No wallet linked yet.</p> : (
            <ul>{links.map((l) => <li key={l.address + l.chain_id}><code>{l.address}</code> · chain {l.chain_id}</li>)}</ul>
          )}
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '1rem' }}>Link a wallet</h2>
          <p>You sign a message to prove the wallet is yours. It costs nothing and sends no transaction.</p>
          {!isConnected ? (
            <button className="btn" disabled={connecting || connectors.length === 0} onClick={() => connect({ connector: connectors[0] })}>
              Connect wallet
            </button>
          ) : (
            <>
              <p>Connected: <code>{address}</code></p>
              <button className="btn" disabled={busy} onClick={link}>{busy ? 'Waiting for signature…' : 'Link this wallet'}</button>
            </>
          )}
          {note && <p role={note.ok ? 'status' : 'alert'} style={{ marginTop: '0.75rem' }}>{note.text}</p>}
        </>
      )}
    </div>
  );
}
