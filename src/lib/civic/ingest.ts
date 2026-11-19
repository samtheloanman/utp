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

/** Marks the source stale and logs a failure event, so a failed run stays visible. */
async function recordFailure(db: SupabaseClient, slug: string, error: string): Promise<void> {
  const upd = await db
    .from('data_sources')
    .update({ last_attempt_at: new Date().toISOString(), last_error: error, adapter_status: 'stale' })
    .eq('slug', slug)
    .select('id');
  const sourceId = (upd.data as Array<{ id: string }> | null)?.[0]?.id ?? null;
  await db.from('ingest_failures').insert({ source_id: sourceId, error: `${slug}: ${error}` });
}

/**
 * Stores one adapter result: jurisdiction, data source, bills, then one
 * version row per new record hash. Bills are written only from a live result,
 * so a failed fetch never overwrites stored records. The source is marked live
 * only after everything is stored; any failure is recorded instead.
 * The source title is never stored as an official summary.
 * Needs a client that may write these tables (service role).
 */
export async function ingestBills(
  db: SupabaseClient,
  target: IngestTarget,
  result: SourceResult<CivicBill>,
): Promise<IngestOutcome> {
  const fail = async (error: string): Promise<IngestOutcome> => {
    await recordFailure(db, target.sourceSlug, error);
    return { ok: false, error };
  };
  if (result.status !== 'live') {
    await recordFailure(db, target.sourceSlug, result.error ?? result.status);
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
  if (jur.error || !jur.data) return fail('jurisdiction upsert failed');

  const src = await db
    .from('data_sources')
    .upsert(
      {
        slug: target.sourceSlug,
        name: result.source.name,
        type: 'api',
        base_url: result.source.url,
        jurisdiction_id: jur.data.id,
        last_attempt_at: result.fetchedAt,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (src.error || !src.data) return fail('data source upsert failed');

  if (result.items.length > 0) {
    const rows = result.items.map((b) => ({
      source_id: src.data.id,
      jurisdiction_id: jur.data.id,
      external_id: b.externalId,
      bill_number: b.number || b.externalId,
      title: shortTitle(b.title),
      status: b.status,
      introduced_date: b.introducedDate,
      source_url: b.sourceUrl,
      updated_at: result.fetchedAt,
    }));
    const up = await db.from('bills').upsert(rows, { onConflict: 'source_id,external_id' }).select('id,external_id');
    if (up.error || !up.data) return fail('bill upsert failed');

    const hashes = new Map(result.items.map((b) => [b.externalId, b.recordHash]));
    const versions = (up.data as Array<{ id: string; external_id: string }>).map((b) => ({
      bill_id: b.id,
      record_hash: hashes.get(b.external_id),
      fetched_at: result.fetchedAt,
    }));
    const ver = await db.from('bill_versions').upsert(versions, { onConflict: 'bill_id,record_hash', ignoreDuplicates: true });
    if (ver.error) return fail('bill version upsert failed');
  }

  await db
    .from('data_sources')
    .update({ adapter_status: 'live', last_successful_fetch: result.fetchedAt, last_error: null })
    .eq('id', src.data.id);
  return { ok: true, stored: result.items.length };
}
