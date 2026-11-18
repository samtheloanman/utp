import { LEGISTAR_JURISDICTIONS, type LegistarJurisdiction } from '@/lib/civic/legistar';

const STATE_NAMES: Record<string, string> = {
  az: 'Arizona', ca: 'California', co: 'Colorado', fl: 'Florida', ky: 'Kentucky', ma: 'Massachusetts',
  md: 'Maryland', mi: 'Michigan', mo: 'Missouri', nc: 'North Carolina', oh: 'Ohio', pa: 'Pennsylvania',
  tn: 'Tennessee', tx: 'Texas', wa: 'Washington', wi: 'Wisconsin',
};

const stateOf = (j: LegistarJurisdiction): string => j.ocdId.match(/state:([a-z]{2})/)?.[1] ?? '';

function groupByState(): Array<[string, LegistarJurisdiction[]]> {
  const groups = new Map<string, LegistarJurisdiction[]>();
  for (const j of LEGISTAR_JURISDICTIONS) {
    const name = STATE_NAMES[stateOf(j)] ?? stateOf(j).toUpperCase();
    groups.set(name, [...(groups.get(name) ?? []), j]);
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b));
}

export default function CoveragePage() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>Local government coverage</h1>
      <p>
        Cities and counties whose legislation UtP can read from the source. Places not listed here are not
        integrated yet. Each page shows when its data was fetched.
      </p>
      {groupByState().map(([state, places]) => (
        <section key={state} style={{ marginTop: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{state}</h2>
          <ul>
            {places.map((j) => (
              <li key={j.client}>
                <a href={`/legislature?local=${j.client}`}>{j.name}</a>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
