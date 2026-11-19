import type { SupabaseClient } from '@supabase/supabase-js';
import type { CivicBill, SourceResult } from './types';
import type { LegistarJurisdiction } from './legistar';

export interface IngestTarget {
  sourceSlug: string;
  jurisdiction: {
    code: string;
    name: string;
    type: 'federal' | 'state' | 'local' | 'international';
    level: 'federal' | 'state' | 'county' | 'municipal' | 'local' | 'international';
    country: string;
    ocdId: string | null;
  };
}

export type IngestOutcome = { ok: true; stored: number } | { ok: false; error: string };

const TITLE_MAX = 200;

/** Some sources put a whole agenda item in the title; keep its first line as the title. */
export function shortTitle(full: string): string {
  const first = (full.split('\n').find((l) => l.trim()) ?? '').trim() || 'Untitled';
  return first.length > TITLE_MAX ? first.slice(0, TITLE_MAX - 1).trimEnd() + '…' : first;
}

export function legistarTarget(j: LegistarJurisdiction): IngestTarget {
  return {
    sourceSlug: `legistar-${j.client}`,
    jurisdiction: {
      code: j.ocdId,
      name: j.name,
      type: 'local',
      level: j.ocdId.includes('/county:') ? 'county' : 'municipal',
      country: 'US',
      ocdId: j.ocdId,
    },
  };
}

/**
 * Stores one adapter result: jurisdiction, data source, then bills. Bills are
 * written only from a live result, so a failed fetch never overwrites stored
 * records; the failure is recorded on the source instead.
 * Needs a client that may write these tables (service role).
 */
export async function ingestBills(
  db: SupabaseClient,
  target: IngestTarget,
  result: SourceResult<CivicBill>,
): Promise<IngestOutcome> {
  if (result.status !== 'live') {
    await db
      .from('data_sources')
      .update({ last_attempt_at: new Date().toISOString(), last_error: result.error ?? result.status, adapter_status: 'stale' })
      .eq('slug', target.sourceSlug);
    return { ok: false, error: `source ${result.status}` };
  }
  const j = target.jurisdiction;

  const jur = await db
    .from('jurisdictions')
    .upsert(
      { code: j.code, name: j.name, type: j.type, level: j.level, country: j.country, ocd_id: j.ocdId },
      { onConflict: 'code' },
    )
    .select('id')
    .single();
  if (jur.error || !jur.data) return { ok: false, error: 'jurisdiction upsert failed' };

  const src = await db
    .from('data_sources')
    .upsert(
      {
        slug: target.sourceSlug,
        name: result.source.name,
        type: 'api',
        base_url: result.source.url,
        jurisdiction_id: jur.data.id,
        adapter_status: 'live',
        last_successful_fetch: result.fetchedAt,
        last_attempt_at: result.fetchedAt,
        last_error: null,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (src.error || !src.data) return { ok: false, error: 'data source upsert failed' };
  if (result.items.length === 0) return { ok: true, stored: 0 };

  const rows = result.items.map((b) => ({
    source_id: src.data.id,
    jurisdiction_id: jur.data.id,
    external_id: b.externalId,
    bill_number: b.number || b.externalId,
    title: shortTitle(b.title),
    summary_official: shortTitle(b.title) === b.title.trim() ? null : b.title.trim(),
    status: b.status,
    introduced_date: b.introducedDate,
    source_url: b.sourceUrl,
    updated_at: result.fetchedAt,
  }));
  const up = await db.from('bills').upsert(rows, { onConflict: 'source_id,external_id' });
  if (up.error) return { ok: false, error: 'bill upsert failed' };
  return { ok: true, stored: rows.length };
}
