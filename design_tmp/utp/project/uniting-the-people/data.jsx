/* Sample civic polling data for Uniting the People.
   cc = ISO country code for flag image (null = supranational/global -> globe icon).
   img = representative Unsplash photo id. source.ico = icon key (see icons.jsx). */

const SCALES = [
  { key: 'all',      label: 'All',      ico: 'layers' },
  { key: 'local',    label: 'Local',    ico: 'local' },
  { key: 'regional', label: 'Regional', ico: 'regional' },
  { key: 'national', label: 'National', ico: 'national' },
  { key: 'global',   label: 'Global',   ico: 'global' },
];

const CATEGORIES = ['All', 'Climate', 'Health', 'Economy', 'Rights', 'Technology', 'Governance', 'Education'];

function series(start, end, n = 14, jitter = 3) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const base = start + (end - start) * t;
    const wobble = Math.sin(i * 1.7) * jitter + (i % 3 - 1) * (jitter * 0.5);
    out.push(Math.max(2, Math.min(96, Math.round(base + wobble))));
  }
  out[n - 1] = end;
  return out;
}

const ISSUES = [
  {
    id: 'global-plastics',
    scale: 'global', category: 'Climate',
    region: 'United Nations', cc: null, scope: 'UN Treaty',
    img: 'photo-1621451537084-482c73073a0f',
    question: 'Should a binding global treaty cut new plastic production 40% by 2035?',
    status: 'live', deadline: 'Closes in 9 days',
    for: 71, against: 18, unsure: 11, voices: 248130,
    history: series(54, 71), deltaWeek: +6,
    tldr: 'Negotiators are drafting the first legally-binding instrument on plastic pollution. The core fight is whether the treaty caps <b>production</b> or only improves recycling and waste management downstream.',
    argsFor: [
      { t: 'Production caps are the only lever shown to reduce ocean plastic at scale; recycling alone has plateaued near 9% globally.', cite: 'UNEP 2024' },
      { t: 'A predictable global ceiling lets manufacturers invest in refill and reuse systems instead of competing on cheap virgin plastic.', cite: 'OECD Outlook' },
      { t: 'Microplastics are now found in human blood and placentas; a precautionary cap addresses an unfolding health risk.', cite: 'Env. Intl.' },
    ],
    argsAgainst: [
      { t: 'A hard cap could raise costs for medical and food-safety packaging in lower-income countries that lack alternatives.', cite: 'WHO note' },
      { t: 'Enforcement across 190+ states is unproven; without verification a cap may shift production rather than cut it.', cite: 'Chatham House' },
    ],
    confidence: 0.86,
    sources: [
      { name: 'UN Environment Programme', meta: 'Treaty drafts · Public domain', ico: 'globe', health: 'Healthy' },
      { name: 'OECD Global Plastics Outlook', meta: 'Dataset · CC BY 4.0', ico: 'chart', health: 'Healthy' },
    ],
  },
  {
    id: 'global-ai-body',
    scale: 'global', category: 'Technology',
    region: 'Global', cc: null, scope: 'Multilateral',
    img: 'photo-1518770660439-4636190af475',
    question: 'Create an international AI safety body with binding authority over frontier models?',
    status: 'live', deadline: 'Closes in 21 days',
    for: 58, against: 29, unsure: 13, voices: 176540,
    history: series(61, 58, 14, 4), deltaWeek: -3,
    tldr: 'Proposals range from an "IAEA for AI" with inspection powers to a voluntary coordination forum. The debate centers on <b>binding authority</b> versus national sovereignty over technology policy.',
    argsFor: [
      { t: 'Frontier risks (bio, cyber, autonomous systems) cross borders; no single regulator can contain them alone.', cite: 'Bletchley Decl.' },
      { t: 'Shared evaluations would reduce a race-to-the-bottom on safety testing between labs and states.', cite: 'IDAIS' },
    ],
    argsAgainst: [
      { t: 'A binding global body could entrench incumbents and slow open research that improves safety transparency.', cite: 'Mozilla' },
      { t: 'Enforcement requires access to model weights and data centers that most states will not concede.', cite: 'CSIS' },
    ],
    confidence: 0.74,
    sources: [
      { name: 'Bletchley Declaration', meta: '28 signatory states', ico: 'doc', health: 'Healthy' },
      { name: 'AI Safety Institutes', meta: 'Public reports', ico: 'science', health: 'Healthy' },
    ],
  },
  {
    id: 'global-water',
    scale: 'global', category: 'Rights',
    region: 'Global', cc: null, scope: 'UN Resolution',
    img: 'photo-1538300342682-cf57afb97285',
    question: 'Recognize access to clean drinking water as an enforceable human right worldwide?',
    status: 'live', deadline: 'Closes in 30 days',
    for: 84, against: 7, unsure: 9, voices: 312890,
    history: series(78, 84), deltaWeek: +2,
    tldr: 'The UN recognized water as a right in 2010, but it is non-binding. This poll asks whether it should become <b>enforceable</b>, obligating states and funders to act.',
    argsFor: [
      { t: '2.2 billion people still lack safely managed drinking water; a binding right would prioritize funding.', cite: 'WHO/UNICEF' },
      { t: 'Enforceability gives communities legal standing against pollution and privatization.', cite: 'UN OHCHR' },
    ],
    argsAgainst: [
      { t: 'Without financing mechanisms, an enforceable right risks unfunded mandates on poorer states.', cite: 'World Bank' },
    ],
    confidence: 0.81,
    sources: [
      { name: 'WHO / UNICEF JMP', meta: 'Water & sanitation data', ico: 'water', health: 'Healthy' },
      { name: 'UN OHCHR', meta: 'Resolution 64/292', ico: 'law', health: 'Healthy' },
    ],
  },
  {
    id: 'natl-insulin',
    scale: 'national', category: 'Health',
    region: 'United States', cc: 'us', scope: 'Federal Bill',
    img: 'photo-1576602976047-174e57a47881',
    question: 'H.R. 1234 — Cap the price of insulin at $35 per month for all patients?',
    status: 'live', deadline: 'Floor vote pending',
    billNo: 'H.R. 1234 · 118th Congress',
    for: 79, against: 14, unsure: 7, voices: 154210,
    history: series(70, 79), deltaWeek: +4,
    tldr: 'The bill extends the $35 insulin cap beyond Medicare to the commercial market. The dispute is over <b>price controls</b> versus manufacturer-funded patient assistance.',
    argsFor: [
      { t: 'List prices rose over 600% in two decades while production costs fell; a cap restores affordability.', cite: 'Section 2(a)' },
      { t: 'One in four insulin users reports rationing doses, driving costly ER visits.', cite: 'CDC 2023' },
    ],
    argsAgainst: [
      { t: 'Manufacturers warn caps could shift costs to premiums for all insured patients.', cite: 'PhRMA' },
      { t: 'Targeted subsidies may reach low-income patients more efficiently than a universal cap.', cite: 'CBO score' },
    ],
    confidence: 0.88,
    sources: [
      { name: 'Congress.gov', meta: 'Bill text & actions · Public domain', ico: 'gov', health: 'Healthy' },
      { name: 'Congressional Budget Office', meta: 'Cost estimate', ico: 'money', health: 'Healthy' },
    ],
  },
  {
    id: 'natl-fourday',
    scale: 'national', category: 'Economy',
    region: 'United Kingdom', cc: 'gb', scope: 'National Policy',
    img: 'photo-1497366216548-37526070297c',
    question: 'Adopt a 32-hour, four-day work week as the national standard with no loss of pay?',
    status: 'live', deadline: 'Closes in 12 days',
    for: 63, against: 27, unsure: 10, voices: 98730,
    history: series(55, 63), deltaWeek: +5,
    tldr: 'Following large pilot programs, this asks whether a four-day week should become the legal default. Debate centers on <b>productivity</b> claims versus impacts on shift and care sectors.',
    argsFor: [
      { t: '89% of companies in the UK pilot kept the policy; most reported steady or higher output.', cite: '4DW Pilot' },
      { t: 'Reduced burnout and commuting cut sick days and carbon emissions.', cite: 'Autonomy' },
    ],
    argsAgainst: [
      { t: 'Healthcare, retail and manufacturing cannot easily compress hours without added staff.', cite: 'CBI' },
      { t: 'Small firms may face higher per-output labor costs.', cite: 'FSB' },
    ],
    confidence: 0.77,
    sources: [
      { name: '4 Day Week Global', meta: 'Pilot results', ico: 'calendar', health: 'Healthy' },
      { name: 'Autonomy Research', meta: 'Working paper', ico: 'chart', health: 'Degraded' },
    ],
  },
  {
    id: 'natl-eafc',
    scale: 'national', category: 'Economy',
    region: 'Kenya', cc: 'ke', scope: 'Treaty Ratification',
    img: 'photo-1611974789855-9c2a0a7236a3',
    question: 'Should Kenya ratify the East African single-currency roadmap by 2030?',
    status: 'live', deadline: 'Closes in 18 days',
    for: 46, against: 38, unsure: 16, voices: 61240,
    history: series(52, 46, 14, 4), deltaWeek: -4,
    tldr: 'The EAC monetary union aims for a shared currency. The question is whether 2030 is realistic given <b>convergence criteria</b> on inflation and debt.',
    argsFor: [
      { t: 'A single currency would cut cross-border transaction costs for regional traders.', cite: 'EAC Sec.' },
      { t: 'Deeper integration could attract larger pooled investment.', cite: 'AfDB' },
    ],
    argsAgainst: [
      { t: 'Member economies have not met inflation and fiscal convergence targets.', cite: 'IMF Art. IV' },
      { t: 'Loss of independent monetary policy is risky amid currency volatility.', cite: 'KIPPRA' },
    ],
    confidence: 0.69,
    sources: [
      { name: 'East African Community', meta: 'Monetary union protocol', ico: 'globe', health: 'Healthy' },
      { name: 'IMF', meta: 'Article IV consultation', ico: 'chart', health: 'Healthy' },
    ],
  },
  {
    id: 'reg-plastics-eu',
    scale: 'regional', category: 'Climate',
    region: 'European Union', cc: 'eu', scope: 'EU Regulation',
    img: 'photo-1542838132-92c53300491e',
    question: 'Ban single-use plastic packaging for fresh produce across the EU by 2028?',
    status: 'live', deadline: 'Closes in 15 days',
    for: 68, against: 22, unsure: 10, voices: 142060,
    history: series(60, 68), deltaWeek: +3,
    tldr: 'Building on the Packaging and Packaging Waste Regulation, this targets produce packaging specifically. Debate is over <b>food waste</b> trade-offs versus plastic reduction.',
    argsFor: [
      { t: 'Loose produce sales reduce packaging waste with minimal spoilage for most items.', cite: 'PPWR' },
      { t: 'Several member states already ban it with no measured rise in food waste.', cite: 'ADEME' },
    ],
    argsAgainst: [
      { t: 'Some perishables (berries, cut greens) spoil faster unpackaged, raising food waste.', cite: 'EUROPEN' },
    ],
    confidence: 0.79,
    sources: [
      { name: 'European Commission', meta: 'PPWR · Open data', ico: 'gov', health: 'Healthy' },
      { name: 'ADEME', meta: 'Lifecycle study', ico: 'recycle', health: 'Healthy' },
    ],
  },
  {
    id: 'reg-transit',
    scale: 'regional', category: 'Governance',
    region: 'Greater São Paulo', cc: 'br', scope: 'Metro Region',
    img: 'photo-1556122071-e404eaedb77f',
    question: 'Fund a unified regional transit fare across all 39 municipalities?',
    status: 'live', deadline: 'Closes in 7 days',
    for: 74, against: 16, unsure: 10, voices: 53310,
    history: series(66, 74), deltaWeek: +5,
    tldr: 'A single fare card and integrated pricing across the metro region. The fight is over <b>cost-sharing</b> between wealthier and poorer municipalities.',
    argsFor: [
      { t: 'Integrated fares cut commute costs for low-income workers who transfer multiple times.', cite: 'Metrô SP' },
      { t: 'Unified ticketing increases ridership and farebox recovery over time.', cite: 'ITDP' },
    ],
    argsAgainst: [
      { t: 'Revenue redistribution between municipalities is politically contested.', cite: 'CMSP' },
    ],
    confidence: 0.72,
    sources: [
      { name: 'Metrô de São Paulo', meta: 'Ridership data', ico: 'transit', health: 'Healthy' },
      { name: 'ITDP', meta: 'Transit policy brief', ico: 'transit', health: 'Healthy' },
    ],
  },
  {
    id: 'local-mainst',
    scale: 'local', category: 'Governance',
    region: 'Austin, TX', cc: 'us', scope: 'City Council',
    img: 'photo-1519677100203-a0e668c92439',
    question: 'Convert six blocks of Main Street to a permanent pedestrian-only zone?',
    status: 'live', deadline: 'City council · 11 days',
    for: 57, against: 33, unsure: 10, voices: 8420,
    history: series(49, 57), deltaWeek: +4,
    tldr: 'A weekend pilot would become permanent. Local businesses are split on whether foot traffic offsets lost <b>parking and deliveries</b>.',
    argsFor: [
      { t: 'Pilot weekends saw a 22% rise in local retail sales along the corridor.', cite: 'City pilot' },
      { t: 'Pedestrian streets reduce collisions and improve air quality.', cite: 'NACTO' },
    ],
    argsAgainst: [
      { t: 'Some shop owners worry about delivery access and customers with mobility needs.', cite: 'Chamber' },
    ],
    confidence: 0.7,
    sources: [
      { name: 'City of Austin Open Data', meta: 'Pilot evaluation', ico: 'gov', health: 'Healthy' },
      { name: 'NACTO', meta: 'Street design guide', ico: 'transit', health: 'Healthy' },
    ],
  },
  {
    id: 'local-budget',
    scale: 'local', category: 'Governance',
    region: 'Lisbon', cc: 'pt', scope: 'City Council',
    img: 'photo-1585208798174-6cedd86e019a',
    question: 'Allocate 5% of the city budget to projects chosen directly by residents?',
    status: 'live', deadline: 'Closes in 5 days',
    for: 81, against: 9, unsure: 10, voices: 14760,
    history: series(73, 81), deltaWeek: +6,
    tldr: 'Expands participatory budgeting from a small pilot to a fixed 5% share. Debate is over <b>capacity</b> to administer many small citizen-led projects.',
    argsFor: [
      { t: 'Participatory budgeting raises trust in local government and turnout.', cite: 'OECD' },
      { t: 'Lisbon’s pilot delivered popular parks and accessibility upgrades on budget.', cite: 'CM Lisboa' },
    ],
    argsAgainst: [
      { t: 'Administering many small projects strains municipal staff.', cite: 'Audit office' },
    ],
    confidence: 0.76,
    sources: [
      { name: 'Câmara Municipal de Lisboa', meta: 'PB results', ico: 'gov', health: 'Healthy' },
      { name: 'OECD', meta: 'Innovative citizen participation', ico: 'book', health: 'Healthy' },
    ],
  },
  {
    id: 'local-transit-free',
    scale: 'local', category: 'Economy',
    region: 'Tallinn', cc: 'ee', scope: 'City Referendum',
    img: 'photo-1570125909232-eb263c188f7e',
    question: 'Keep public transit free for all residents permanently?',
    status: 'live', deadline: 'Closes in 26 days',
    for: 69, against: 21, unsure: 10, voices: 19880,
    history: series(64, 69), deltaWeek: +2,
    tldr: 'Tallinn pioneered fare-free transit in 2013. This asks residents whether to lock it in despite <b>budget pressure</b>.',
    argsFor: [
      { t: 'Free transit increased registered residency and local tax revenue.', cite: 'TLU study' },
      { t: 'It improves mobility for low-income and elderly residents.', cite: 'City data' },
    ],
    argsAgainst: [
      { t: 'Foregone fare revenue must be covered by other taxes or service cuts.', cite: 'Finance dept' },
    ],
    confidence: 0.73,
    sources: [
      { name: 'Tallinn City Government', meta: 'Transit ridership', ico: 'transit', health: 'Healthy' },
      { name: 'Tallinn University', meta: 'Mobility study', ico: 'book', health: 'Degraded' },
    ],
  },
  {
    id: 'natl-vote16',
    scale: 'national', category: 'Rights',
    region: 'Germany', cc: 'de', scope: 'Electoral Reform',
    img: 'photo-1540910419892-4a36d2c3266c',
    question: 'Lower the national voting age to 16 for federal elections?',
    status: 'live', deadline: 'Closes in 19 days',
    for: 52, against: 40, unsure: 8, voices: 87420,
    history: series(48, 52, 14, 4), deltaWeek: +1,
    tldr: 'Germany lowered the EU-election voting age to 16; this extends it to federal elections. The debate weighs <b>youth representation</b> against political maturity arguments.',
    argsFor: [
      { t: '16-year-olds already vote in EU and several state elections without issues.', cite: 'BMI' },
      { t: 'Earlier enfranchisement is linked to lifelong voting habits.', cite: 'Study' },
    ],
    argsAgainst: [
      { t: 'Critics argue voting should align with full legal majority at 18.', cite: 'Opposition' },
    ],
    confidence: 0.71,
    sources: [
      { name: 'Bundesministerium des Innern', meta: 'Electoral data', ico: 'gov', health: 'Healthy' },
      { name: 'Bundeszentrale', meta: 'Civic research', ico: 'book', health: 'Healthy' },
    ],
  },
];

function makeActivity(issue) {
  const verbs = { for: 'voted For', against: 'voted Against', unsure: 'is Unsure' };
  const names = ['A. Mwangi', 'L. Costa', 'S. Patel', 'M. Dubois', 'K. Tanaka', 'R. Silva', 'N. Haddad', 'E. Larsson', 'J. Okafor', 'D. Romano'];
  const times = ['just now', '2m', '5m', '11m', '23m', '40m'];
  const picks = [];
  for (let i = 0; i < 6; i++) {
    const r = Math.random();
    const v = r < issue.for / 100 ? 'for' : r < (issue.for + issue.against) / 100 ? 'against' : 'unsure';
    picks.push({ name: names[(i * 3 + 1) % names.length], v, verb: verbs[v], time: times[i] });
  }
  return picks;
}

const IMG_BASE = 'https://images.unsplash.com/';

/* Resolve a CDN url to an inlined blob url when this page has been bundled
   into standalone HTML (window.__resources). Falls back to the live url. */
function buildResMap() {
  if (window.__resByUrl) return window.__resByUrl;
  if (!window.__resources) return null;
  const map = {};
  document.querySelectorAll('meta[name="ext-resource-dependency"]').forEach(m => {
    const id = m.getAttribute('data-resource-id');
    const u = m.getAttribute('content');
    if (window.__resources[id]) map[u] = window.__resources[id];
  });
  window.__resByUrl = map;
  return map;
}
function resolveRes(url) { const m = buildResMap(); return (m && m[url]) || url; }

/* EU isn't a flagcdn country code — inline its flag as a self-contained data URI. */
const EU_FLAG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 60">' +
  '<rect width="60" height="60" fill="%23003399"/>' +
  (function(){ let s=''; for(let i=0;i<12;i++){ const a=i*Math.PI/6 - Math.PI/2; const x=30+18*Math.cos(a); const y=30+18*Math.sin(a);
    s+='<circle cx="'+x.toFixed(1)+'" cy="'+y.toFixed(1)+'" r="2.6" fill="%23FFCC00"/>'; } return s; })() +
  '</svg>'
);

function photoUrl(id, w) { return resolveRes(IMG_BASE + id + '?auto=format&fit=crop&w=' + (w || 800) + '&q=70'); }
function flagUrl(cc, w) {
  if (!cc) return null;
  if (cc === 'eu') return EU_FLAG;
  return resolveRes('https://flagcdn.com/w' + (w || 80) + '/' + cc + '.png');
}

Object.assign(window, { SCALES, CATEGORIES, ISSUES, makeActivity, photoUrl, flagUrl });
