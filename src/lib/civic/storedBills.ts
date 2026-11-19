import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface StoredBill {
  id: string;
  number: string;
  title: string;
  status: string | null;
  sourceUrl: string;
  updatedAt: string | null;
  place: string | null;
}

export interface Tally {
  for: number;
  against: number;
  unsure: number;
  total: number;
}

const COLUMNS = 'id,bill_number,title,status,source_url,updated_at,jurisdictions(name)';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Row = {
  id: string; bill_number: string; title: string; status: string | null; source_url: string; updated_at: string | null;
  jurisdictions: { name: string } | { name: string }[] | null;
};

function toBill(r: Row): StoredBill {
  const j = Array.isArray(r.jurisdictions) ? r.jurisdictions[0] : r.jurisdictions;
  return {
    id: r.id, number: r.bill_number, title: r.title, status: r.status,
    sourceUrl: r.source_url, updatedAt: r.updated_at, place: j?.name ?? null,
  };
}

export const isBillId = (id: string): boolean => UUID_RE.test(id);

/** Most recently updated stored bills. Empty on any read failure. */
export async function listStoredBills(limit = 50, db: SupabaseClient = supabase): Promise<StoredBill[]> {
  const { data, error } = await db.from('bills').select(COLUMNS).order('updated_at', { ascending: false }).limit(limit);
  if (error || !data) return [];
  return (data as unknown as Row[]).map(toBill);
}

export async function getStoredBill(id: string, db: SupabaseClient = supabase): Promise<StoredBill | null> {
  if (!isBillId(id)) return null;
  const { data, error } = await db.from('bills').select(COLUMNS).eq('id', id).maybeSingle();
  if (error || !data) return null;
  return toBill(data as unknown as Row);
}

export async function getTally(id: string, db: SupabaseClient = supabase): Promise<Tally> {
  const { data } = await db
    .from('vote_aggregates')
    .select('count_for,count_against,count_unsure,total_votes')
    .eq('bill_id', id)
    .maybeSingle();
  const a = data as { count_for: number; count_against: number; count_unsure: number; total_votes: number } | null;
  return { for: a?.count_for ?? 0, against: a?.count_against ?? 0, unsure: a?.count_unsure ?? 0, total: a?.total_votes ?? 0 };
}

/** Whole-number shares; all zero when nobody has voted. */
export function tallyPercent(t: Tally): { for: number; against: number; unsure: number } {
  if (t.total <= 0) return { for: 0, against: 0, unsure: 0 };
  const pct = (n: number) => Math.round((n / t.total) * 100);
  return { for: pct(t.for), against: pct(t.against), unsure: pct(t.unsure) };
}
