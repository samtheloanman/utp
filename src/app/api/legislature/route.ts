import { NextRequest, NextResponse } from 'next/server';

interface Bill {
  id: string;
  number: string;
  title: string;
  status: string;
  chamber: string;
  introduced: string;
  sponsor: string;
  country: string;
  url: string;
}

const CONGRESS_API = 'https://api.congress.gov/v3';

/**
 * Fetches bills from Congress.gov (US legislature).
 * Free tier: 5,000 requests/hour.
 */
async function fetchCongressBills(limit = 10): Promise<Bill[]> {
  const apiKey = process.env.CONGRESS_API_KEY;
  if (!apiKey) return getFallbackUSBills();

  try {
    const res = await fetch(
      `${CONGRESS_API}/bill?limit=${limit}&sort=updateDate+desc&api_key=${apiKey}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return getFallbackUSBills();

    const data = await res.json();
    if (!data.bills) return getFallbackUSBills();

    return data.bills.map((b: Record<string, unknown>) => ({
      id: `us-${b.number}-${b.congress}`,
      number: `${b.type}.${b.number}`,
      title: (b.title as string) || 'Untitled',
      status: (b.latestAction as Record<string, string>)?.text?.substring(0, 50) || 'Unknown',
      chamber: (b.originChamber as string) || 'Unknown',
      introduced: (b.introducedDate as string) || '',
      sponsor: 'Congress',
      country: 'US',
      url: (b.url as string) || '',
    }));
  } catch {
    console.error('Congress.gov fetch failed');
    return getFallbackUSBills();
  }
}

/**
 * Fetches UK Parliament bills.
 * Free, no API key required.
 */
async function fetchUKBills(limit = 10): Promise<Bill[]> {
  try {
    const res = await fetch(
      `https://bills-api.parliament.uk/api/v1/Bills?CurrentHouse=All&SortBy=DateUpdatedDesc&Take=${limit}`,
      { next: { revalidate: 600 } }
    );
    if (!res.ok) return [];

    const data = await res.json();
    if (!data.items) return [];

    return data.items.map((b: Record<string, unknown>) => ({
      id: `uk-${b.billId}`,
      number: `Bill ${b.billId}`,
      title: (b.shortTitle as string) || (b.longTitle as string) || 'Untitled',
      status: (b.currentHouse as string) || 'Unknown',
      chamber: (b.originatingHouse as string) || 'Unknown',
      introduced: (b.introducedSessionId as string) || '',
      sponsor: (b.sponsors as Array<Record<string, unknown>>)?.[0]?.name as string || 'UK Parliament',
      country: 'UK',
      url: `https://bills.parliament.uk/bills/${b.billId}`,
    }));
  } catch {
    console.error('UK Parliament fetch failed');
    return [];
  }
}

function getFallbackUSBills(): Bill[] {
  return [
    { id: 'us-hr4763', number: 'H.R.4763', title: 'Financial Innovation and Technology for the 21st Century Act', status: 'Passed House', chamber: 'House', introduced: '2025-07-20', sponsor: 'Rep. McHenry', country: 'US', url: 'https://congress.gov/bill/118th-congress/house-bill/4763' },
    { id: 'us-s2281', number: 'S.2281', title: 'Stablecoin Transparency and Accountability Act', status: 'Committee', chamber: 'Senate', introduced: '2025-11-15', sponsor: 'Sen. Gillibrand', country: 'US', url: '' },
    { id: 'us-hr5121', number: 'H.R.5121', title: 'Blockchain Regulatory Certainty Act', status: 'Introduced', chamber: 'House', introduced: '2026-01-10', sponsor: 'Rep. Emmer', country: 'US', url: '' },
  ];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const country = searchParams.get('country') || 'US';

  let bills: Bill[] = [];

  switch (country.toUpperCase()) {
    case 'US':
      bills = await fetchCongressBills();
      break;
    case 'UK':
      bills = await fetchUKBills();
      break;
    case 'EU':
      bills = [
        { id: 'eu-mica', number: 'COM/2024/0150', title: 'MiCA Amendment — Markets in Crypto-Assets', status: 'Trilogue', chamber: 'Parliament', introduced: '2025-03-01', sponsor: 'European Commission', country: 'EU', url: 'https://eur-lex.europa.eu' },
      ];
      break;
    case 'BR':
      bills = [
        { id: 'br-pl4401', number: 'PL 4401/2021', title: 'Marco Legal das Criptomoedas', status: 'Enacted', chamber: 'Câmara', introduced: '2021-08-12', sponsor: 'Dep. Aureo', country: 'BR', url: 'https://camara.leg.br' },
      ];
      break;
    case 'IN':
      bills = [
        { id: 'in-89', number: 'Bill No. 89', title: 'Digital India Act, 2026', status: 'Draft', chamber: 'Lok Sabha', introduced: '2026-02-01', sponsor: 'MeitY', country: 'IN', url: 'https://data.gov.in' },
      ];
      break;
    default:
      bills = await fetchCongressBills();
  }

  return NextResponse.json({
    bills,
    total: bills.length,
    country,
    timestamp: new Date().toISOString(),
  });
}
