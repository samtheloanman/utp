import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ISSUES } from '@/lib/data';

const MAX_QUESTION_LEN = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface DebateArgument {
  t: string;
  cite: string;
  sourceUrl?: string;
}

export interface DebateResponse {
  status: 'sourced' | 'sample' | 'offline';
  isSample: boolean;
  tldr: string;
  argsFor: DebateArgument[];
  argsAgainst: DebateArgument[];
  confidence: number;
  sourceUrl?: string;
}

export function sanitizePlainText(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasConfiguredSupabaseEnv(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
      key &&
      !url.includes('placeholder.supabase.co') &&
      !url.includes('your-project.supabase.co') &&
      key !== 'placeholder-key' &&
      key !== 'your-anon-key',
  );
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const payload = (body && typeof body === 'object' ? body : {}) as {
    issueId?: unknown;
    billId?: unknown;
    question?: unknown;
  };

  const issueId = typeof payload.issueId === 'string' ? payload.issueId.trim() : '';
  const billId = typeof payload.billId === 'string' ? payload.billId.trim() : issueId;
  const rawQuestion = typeof payload.question === 'string' ? payload.question.trim() : '';

  if (!issueId && !billId && !rawQuestion) {
    return NextResponse.json({ error: 'question or issueId is required' }, { status: 400 });
  }
  if (rawQuestion.length > MAX_QUESTION_LEN) {
    return NextResponse.json(
      { error: `question must be at most ${MAX_QUESTION_LEN} characters` },
      { status: 400 },
    );
  }

  // 1. Sourced legislative record lookup when a valid bill UUID is supplied
  if (UUID_RE.test(billId) && hasConfiguredSupabaseEnv()) {
    try {
      const db = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
      const { data: bill } = await db
        .from('bills')
        .select('bill_number, title, summary_official, source_url')
        .eq('id', billId)
        .maybeSingle();

      if (bill?.summary_official) {
        const result: DebateResponse = {
          status: 'sourced',
          isSample: false,
          tldr: sanitizePlainText(bill.summary_official),
          argsFor: [],
          argsAgainst: [],
          confidence: 1,
          sourceUrl: bill.source_url ?? undefined,
        };
        return NextResponse.json(result);
      }
    } catch {
      // Fall through to explicit offline status rather than fabricating content.
    }
  }

  // 2. Curated static sample issue lookup (explicitly marked status: 'sample')
  if (issueId) {
    const sample = ISSUES.find((item) => item.id === issueId);
    if (sample) {
      const result: DebateResponse = {
        status: 'sample',
        isSample: true,
        tldr: sanitizePlainText(sample.tldr),
        argsFor: sample.argsFor.map((a) => ({
          t: sanitizePlainText(a.t),
          cite: sanitizePlainText(a.cite),
        })),
        argsAgainst: sample.argsAgainst.map((a) => ({
          t: sanitizePlainText(a.t),
          cite: sanitizePlainText(a.cite),
        })),
        confidence: sample.confidence,
      };
      return NextResponse.json(result);
    }
  }

  // 3. Honest offline response — never interpolate untrusted input into HTML or invent citations
  const offlineResponse: DebateResponse = {
    status: 'offline',
    isSample: true,
    tldr: 'Source-grounded legislative digest is unavailable until an official bill summary is indexed for this item.',
    argsFor: [],
    argsAgainst: [],
    confidence: 0,
  };
  return NextResponse.json(offlineResponse);
}
