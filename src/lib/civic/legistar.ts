import { recordHash } from './hash';
import { withTimeout } from './http';
import type { CivicBill, SourceAdapter, SourceResult } from './types';

export interface LegistarJurisdiction {
  /** Legistar Web API client slug (webapi.legistar.com/v1/{client}). */
  client: string;
  name: string;
  /** Open Civic Data division id; the global jurisdiction key. */
  ocdId: string;
}

/** Jurisdictions whose Legistar Web API answered on 2026-11-17 (census probe). */
export const LEGISTAR_JURISDICTIONS: readonly LegistarJurisdiction[] = [
  { client: 'lacounty', name: 'Los Angeles County', ocdId: 'ocd-division/country:us/state:ca/county:los_angeles' },
  { client: 'sanjose', name: 'San Jose', ocdId: 'ocd-division/country:us/state:ca/place:san_jose' },
  { client: 'sfgov', name: 'San Francisco', ocdId: 'ocd-division/country:us/state:ca/place:san_francisco' },
  { client: 'oakland', name: 'Oakland', ocdId: 'ocd-division/country:us/state:ca/place:oakland' },
  { client: 'fresno', name: 'Fresno', ocdId: 'ocd-division/country:us/state:ca/place:fresno' },
  { client: 'sacramento', name: 'Sacramento', ocdId: 'ocd-division/country:us/state:ca/place:sacramento' },
  { client: 'longbeach', name: 'Long Beach', ocdId: 'ocd-division/country:us/state:ca/place:long_beach' },
  { client: 'santaclara', name: 'Santa Clara', ocdId: 'ocd-division/country:us/state:ca/place:santa_clara' },
  { client: 'sanbernardino', name: 'San Bernardino', ocdId: 'ocd-division/country:us/state:ca/place:san_bernardino' },
  { client: 'stockton', name: 'Stockton', ocdId: 'ocd-division/country:us/state:ca/place:stockton' },
  { client: 'riversideca', name: 'Riverside', ocdId: 'ocd-division/country:us/state:ca/place:riverside' },
  { client: 'chulavista', name: 'Chula Vista', ocdId: 'ocd-division/country:us/state:ca/place:chula_vista' },
  { client: 'sanmateocounty', name: 'San Mateo County', ocdId: 'ocd-division/country:us/state:ca/county:san_mateo' },
  { client: 'phoenix', name: 'Phoenix', ocdId: 'ocd-division/country:us/state:az/place:phoenix' },
  { client: 'maricopa', name: 'Maricopa County', ocdId: 'ocd-division/country:us/state:az/county:maricopa' },
  { client: 'pima', name: 'Pima County', ocdId: 'ocd-division/country:us/state:az/county:pima' },
  { client: 'seattle', name: 'Seattle', ocdId: 'ocd-division/country:us/state:wa/place:seattle' },
  { client: 'kingcounty', name: 'King County', ocdId: 'ocd-division/country:us/state:wa/county:king' },
  { client: 'denver', name: 'Denver', ocdId: 'ocd-division/country:us/state:co/place:denver' },
  { client: 'boston', name: 'Boston', ocdId: 'ocd-division/country:us/state:ma/place:boston' },
  { client: 'miamidade', name: 'Miami-Dade County', ocdId: 'ocd-division/country:us/state:fl/county:miami_dade' },
  { client: 'hillsboroughcounty', name: 'Hillsborough County', ocdId: 'ocd-division/country:us/state:fl/county:hillsborough' },
  { client: 'baltimore', name: 'Baltimore', ocdId: 'ocd-division/country:us/state:md/place:baltimore' },
  { client: 'detroit', name: 'Detroit', ocdId: 'ocd-division/country:us/state:mi/place:detroit' },
  { client: 'columbus', name: 'Columbus', ocdId: 'ocd-division/country:us/state:oh/place:columbus' },
  { client: 'pittsburgh', name: 'Pittsburgh', ocdId: 'ocd-division/country:us/state:pa/place:pittsburgh' },
  { client: 'milwaukee', name: 'Milwaukee', ocdId: 'ocd-division/country:us/state:wi/place:milwaukee' },
  { client: 'nashville', name: 'Nashville', ocdId: 'ocd-division/country:us/state:tn/place:nashville' },
  { client: 'mecklenburg', name: 'Mecklenburg County', ocdId: 'ocd-division/country:us/state:nc/county:mecklenburg' },
  { client: 'wake', name: 'Wake County', ocdId: 'ocd-division/country:us/state:nc/county:wake' },
  { client: 'sanantonio', name: 'San Antonio', ocdId: 'ocd-division/country:us/state:tx/place:san_antonio' },
  { client: 'louisville', name: 'Louisville', ocdId: 'ocd-division/country:us/state:ky/place:louisville' },
  { client: 'kansascity', name: 'Kansas City', ocdId: 'ocd-division/country:us/state:mo/place:kansas_city' },
];

interface Deps {
  fetch?: typeof fetch;
  now?: () => Date;
  timeoutMs?: number;
}

const MAX_PAGE = 50;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const day = (v: unknown): string | null => str(v).slice(0, 10) || null;

function toBill(j: LegistarJurisdiction, m: Record<string, unknown>): CivicBill {
  const id = String(m.MatterId ?? '');
  const externalId = `legistar-${j.client}-${id}`;
  const status = str(m.MatterStatusName) || 'Unknown';
  return {
    externalId,
    jurisdictionCode: j.ocdId,
    number: str(m.MatterFile) || id,
    title: str(m.MatterTitle) || str(m.MatterName) || 'Untitled',
    status,
    introducedDate: day(m.MatterIntroDate),
    sourceUrl: `https://${j.client}.legistar.com/LegislationDetail.aspx?ID=${id}&GUID=${str(m.MatterGuid)}`,
    recordHash: recordHash({ externalId, updateDate: str(m.MatterLastModifiedUtc), latestActionText: status }),
  };
}

/** Local-government adapter for any Legistar (Granicus) client. Public API, no key. */
export function legistarAdapter(j: LegistarJurisdiction, d: Deps = {}): SourceAdapter {
  const doFetch = d.fetch ?? fetch;
  const now = d.now ?? (() => new Date());
  const source = { name: `Legistar (${j.name})`, url: `https://${j.client}.legistar.com/Legislation.aspx` };
  const fail = (error: string): SourceResult<CivicBill> => ({ status: 'unavailable', items: [], fetchedAt: null, source, error });

  return {
    id: `legistar-${j.client}`,
    jurisdictionCode: j.ocdId,
    async fetchBills({ limit, signal }) {
      const top = Math.min(Math.max(limit, 1), MAX_PAGE);
      const url = `https://webapi.legistar.com/v1/${j.client}/matters?$top=${top}&$orderby=MatterLastModifiedUtc%20desc`;
      try {
        const res = await doFetch(url, { signal: withTimeout(signal, d.timeoutMs) });
        if (!res.ok) return fail(`Legistar HTTP ${res.status}`);
        const data: unknown = await res.json();
        if (!Array.isArray(data)) return fail('Legistar response is not an array');
        const items = data.map((m) => toBill(j, m as Record<string, unknown>));
        return { status: 'live', items, fetchedAt: now().toISOString(), source };
      } catch (e) {
        return fail(e instanceof Error ? e.message : 'fetch failed');
      }
    },
  };
}
