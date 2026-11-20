'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface Proposal {
  id: string;
  title: string;
  description: string | null;
  source_url: string | null;
  category: string | null;
  bill_id?: string | null;
}

const field: React.CSSProperties = { display: 'block', width: '100%', padding: '0.5rem', margin: '0.25rem 0 0.75rem', border: '1px solid var(--border, #ccc)', borderRadius: 8 };

export default function ProposePage() {
  return (
    <Suspense>
      <ProposeForm />
    </Suspense>
  );
}

function ProposeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [title, setTitle] = useState(params.get('title') ?? '');
  const [sourceUrl, setSourceUrl] = useState(params.get('sourceUrl') ?? '');
  const billId = params.get('billId');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/propose');
      if (res.ok) setProposals(((await res.json()) as { proposals?: Proposal[] }).proposals ?? []);
    } catch { /* list stays as it was */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch('/api/propose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, sourceUrl, ...(billId ? { billId } : {}) }),
      });
      if (res.status === 401) {
        router.push('/login?redirect=/propose');
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNote({ ok: false, text: body.error ?? 'The proposal could not be saved.' });
        return;
      }
      setNote({ ok: true, text: 'Proposal submitted.' });
      setTitle(''); setDescription(''); setSourceUrl('');
      await load();
    } catch {
      setNote({ ok: false, text: 'The proposal could not be saved.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Propose an action</h1>
      <p>Put an issue in front of the community. Link the bill or article it is about so others can check it.</p>
      <form onSubmit={submit} style={{ marginTop: '1rem' }}>
        <label>Title
          <input style={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
        </label>
        <label>Source link
          <input style={field} type="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" />
        </label>
        <label>Why it matters
          <textarea style={field} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4} />
        </label>
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Submitting…' : 'Submit proposal'}</button>
      </form>
      {note && <p role={note.ok ? 'status' : 'alert'} style={{ marginTop: '0.75rem' }}>{note.text}</p>}

      <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginTop: '2rem' }}>Open proposals</h2>
      {proposals.length === 0 ? <p>No proposals yet.</p> : (
        <ul>
          {proposals.map((p) => (
            <li key={p.id} style={{ margin: '0.5rem 0' }}>
              <b>{p.title}</b>
              {p.source_url ? <> · <a href={p.source_url} target="_blank" rel="noopener noreferrer">source</a></> : null}
              {p.bill_id ? <> · <a href={`/bill/${p.bill_id}`}>vote on the bill</a></> : null}
              {p.description ? <div style={{ fontSize: 14 }}>{p.description}</div> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
