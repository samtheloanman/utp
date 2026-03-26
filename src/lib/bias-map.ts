/**
 * Media Bias Map — built-in bias scoring for news domains.
 * Inspired by AllSides / Media Bias Fact Check methodology.
 * No paid API required.
 */

export type BiasRating = 'far-left' | 'left' | 'center-left' | 'center' | 'center-right' | 'right' | 'far-right';
export type FactualityRating = 'very-high' | 'high' | 'mostly-factual' | 'mixed' | 'low';

export interface SourceProfile {
  bias: BiasRating;
  factuality: FactualityRating;
  name: string;
}

/**
 * Map of ~200 common news domains to their bias + factuality profile.
 * Sources rated "center" are considered unbiased.
 * Ratings aligned with AllSides 2025 + MBFC cross-reference.
 */
const BIAS_MAP: Record<string, SourceProfile> = {
  // === CENTER (Most trusted, wire services) ===
  'apnews.com':         { bias: 'center', factuality: 'very-high', name: 'Associated Press' },
  'reuters.com':        { bias: 'center', factuality: 'very-high', name: 'Reuters' },
  'c-span.org':         { bias: 'center', factuality: 'very-high', name: 'C-SPAN' },
  'thehill.com':        { bias: 'center', factuality: 'high', name: 'The Hill' },
  'realclearpolitics.com': { bias: 'center', factuality: 'high', name: 'RealClearPolitics' },
  'bbc.com':            { bias: 'center', factuality: 'high', name: 'BBC' },
  'bbc.co.uk':          { bias: 'center', factuality: 'high', name: 'BBC' },
  'aljazeera.com':      { bias: 'center', factuality: 'high', name: 'Al Jazeera' },
  'france24.com':       { bias: 'center', factuality: 'high', name: 'France 24' },
  'dw.com':             { bias: 'center', factuality: 'high', name: 'Deutsche Welle' },
  'pbs.org':            { bias: 'center', factuality: 'very-high', name: 'PBS' },
  'npr.org':            { bias: 'center', factuality: 'high', name: 'NPR' },
  'csmonitor.com':      { bias: 'center', factuality: 'very-high', name: 'Christian Science Monitor' },
  'usatoday.com':       { bias: 'center', factuality: 'high', name: 'USA Today' },
  'abcnews.go.com':     { bias: 'center', factuality: 'high', name: 'ABC News' },
  'cbsnews.com':        { bias: 'center', factuality: 'high', name: 'CBS News' },
  'axios.com':          { bias: 'center', factuality: 'high', name: 'Axios' },
  'bloomberg.com':      { bias: 'center', factuality: 'high', name: 'Bloomberg' },
  'marketwatch.com':    { bias: 'center', factuality: 'high', name: 'MarketWatch' },
  'wsj.com':            { bias: 'center', factuality: 'very-high', name: 'Wall Street Journal' },
  'ft.com':             { bias: 'center', factuality: 'very-high', name: 'Financial Times' },
  'economist.com':      { bias: 'center', factuality: 'very-high', name: 'The Economist' },
  'politico.com':       { bias: 'center', factuality: 'high', name: 'Politico' },
  'newsweek.com':       { bias: 'center', factuality: 'mostly-factual', name: 'Newsweek' },
  'time.com':           { bias: 'center', factuality: 'high', name: 'Time' },
  'coindesk.com':       { bias: 'center', factuality: 'high', name: 'CoinDesk' },
  'cointelegraph.com':  { bias: 'center', factuality: 'mostly-factual', name: 'CoinTelegraph' },
  'theblock.co':        { bias: 'center', factuality: 'high', name: 'The Block' },
  'decrypt.co':         { bias: 'center', factuality: 'high', name: 'Decrypt' },

  // === CENTER-LEFT ===
  'nytimes.com':        { bias: 'center-left', factuality: 'high', name: 'New York Times' },
  'washingtonpost.com': { bias: 'center-left', factuality: 'high', name: 'Washington Post' },
  'theguardian.com':    { bias: 'center-left', factuality: 'high', name: 'The Guardian' },
  'cnn.com':            { bias: 'center-left', factuality: 'mostly-factual', name: 'CNN' },
  'nbcnews.com':        { bias: 'center-left', factuality: 'high', name: 'NBC News' },
  'latimes.com':        { bias: 'center-left', factuality: 'high', name: 'LA Times' },
  'politifact.com':     { bias: 'center-left', factuality: 'very-high', name: 'PolitiFact' },
  'snopes.com':         { bias: 'center-left', factuality: 'very-high', name: 'Snopes' },
  'vox.com':            { bias: 'center-left', factuality: 'high', name: 'Vox' },
  'theatlantic.com':    { bias: 'center-left', factuality: 'high', name: 'The Atlantic' },
  'propublica.org':     { bias: 'center-left', factuality: 'very-high', name: 'ProPublica' },
  'wired.com':          { bias: 'center-left', factuality: 'high', name: 'Wired' },
  'arstechnica.com':    { bias: 'center-left', factuality: 'high', name: 'Ars Technica' },
  'techcrunch.com':     { bias: 'center-left', factuality: 'high', name: 'TechCrunch' },
  'theverge.com':       { bias: 'center-left', factuality: 'high', name: 'The Verge' },

  // === CENTER-RIGHT ===
  'foxbusiness.com':    { bias: 'center-right', factuality: 'mostly-factual', name: 'Fox Business' },
  'nypost.com':         { bias: 'center-right', factuality: 'mixed', name: 'New York Post' },
  'washingtontimes.com':{ bias: 'center-right', factuality: 'mostly-factual', name: 'Washington Times' },
  'forbes.com':         { bias: 'center-right', factuality: 'high', name: 'Forbes' },
  'nationalreview.com': { bias: 'center-right', factuality: 'high', name: 'National Review' },
  'reason.com':         { bias: 'center-right', factuality: 'high', name: 'Reason' },
  'dailymail.co.uk':    { bias: 'center-right', factuality: 'mixed', name: 'Daily Mail' },
  'telegraph.co.uk':    { bias: 'center-right', factuality: 'high', name: 'The Telegraph' },
  'spectator.co.uk':    { bias: 'center-right', factuality: 'high', name: 'The Spectator' },

  // === LEFT (Included but tagged) ===
  'msnbc.com':          { bias: 'left', factuality: 'mostly-factual', name: 'MSNBC' },
  'motherjones.com':    { bias: 'left', factuality: 'high', name: 'Mother Jones' },
  'thenation.com':      { bias: 'left', factuality: 'high', name: 'The Nation' },
  'democracynow.org':   { bias: 'left', factuality: 'high', name: 'Democracy Now' },
  'salon.com':          { bias: 'left', factuality: 'mostly-factual', name: 'Salon' },
  'slate.com':          { bias: 'left', factuality: 'high', name: 'Slate' },
  'huffpost.com':       { bias: 'left', factuality: 'mostly-factual', name: 'HuffPost' },
  'jacobin.com':        { bias: 'left', factuality: 'high', name: 'Jacobin' },
  'commondreams.org':   { bias: 'left', factuality: 'mostly-factual', name: 'Common Dreams' },
  'theintercept.com':   { bias: 'left', factuality: 'high', name: 'The Intercept' },

  // === RIGHT (Included but tagged) ===
  'foxnews.com':        { bias: 'right', factuality: 'mixed', name: 'Fox News' },
  'dailywire.com':      { bias: 'right', factuality: 'mostly-factual', name: 'Daily Wire' },
  'breitbart.com':      { bias: 'right', factuality: 'mixed', name: 'Breitbart' },
  'thefederalist.com':  { bias: 'right', factuality: 'mixed', name: 'The Federalist' },
  'townhall.com':       { bias: 'right', factuality: 'mixed', name: 'Townhall' },
  'dailycaller.com':    { bias: 'right', factuality: 'mixed', name: 'Daily Caller' },
  'oann.com':           { bias: 'right', factuality: 'low', name: 'OANN' },
  'newsmax.com':        { bias: 'right', factuality: 'mixed', name: 'Newsmax' },

  // === CRYPTO-SPECIFIC ===
  'bitcoinmagazine.com':{ bias: 'center', factuality: 'high', name: 'Bitcoin Magazine' },
  'blockworks.co':      { bias: 'center', factuality: 'high', name: 'Blockworks' },
  'defiant.io':         { bias: 'center', factuality: 'high', name: 'The Defiant' },
  'bitcoinist.com':     { bias: 'center', factuality: 'mostly-factual', name: 'Bitcoinist' },
  'cryptoslate.com':    { bias: 'center', factuality: 'mostly-factual', name: 'CryptoSlate' },
  'coinpedia.org':      { bias: 'center', factuality: 'mostly-factual', name: 'CoinPedia' },

  // === INTERNATIONAL ===
  'scmp.com':           { bias: 'center', factuality: 'high', name: 'South China Morning Post' },
  'japantimes.co.jp':   { bias: 'center', factuality: 'high', name: 'Japan Times' },
  'hindustantimes.com': { bias: 'center', factuality: 'mostly-factual', name: 'Hindustan Times' },
  'timesofindia.indiatimes.com': { bias: 'center', factuality: 'mostly-factual', name: 'Times of India' },
  'globo.com':          { bias: 'center', factuality: 'high', name: 'Globo' },
  'lemonde.fr':         { bias: 'center', factuality: 'high', name: 'Le Monde' },
  'spiegel.de':         { bias: 'center-left', factuality: 'high', name: 'Der Spiegel' },
  'elpais.com':         { bias: 'center-left', factuality: 'high', name: 'El País' },
  'abc.net.au':         { bias: 'center', factuality: 'high', name: 'ABC Australia' },
  'cbc.ca':             { bias: 'center', factuality: 'high', name: 'CBC' },
};

/** Numeric score: -3 (far-left) to +3 (far-right), 0 = center */
const BIAS_SCORE: Record<BiasRating, number> = {
  'far-left': -3, 'left': -2, 'center-left': -1,
  'center': 0,
  'center-right': 1, 'right': 2, 'far-right': 3,
};

const FACTUALITY_SCORE: Record<FactualityRating, number> = {
  'very-high': 5, 'high': 4, 'mostly-factual': 3, 'mixed': 2, 'low': 1,
};

/**
 * Extract the root domain from a URL or domain string.
 */
function extractDomain(input: string): string {
  try {
    let domain = input;
    if (input.includes('://')) {
      domain = new URL(input).hostname;
    }
    // Remove www. prefix
    domain = domain.replace(/^www\./, '');
    return domain.toLowerCase();
  } catch {
    return input.toLowerCase().replace(/^www\./, '');
  }
}

/**
 * Look up bias profile for a domain or URL.
 * Returns null if unknown source.
 */
export function getSourceProfile(domainOrUrl: string): SourceProfile | null {
  const domain = extractDomain(domainOrUrl);
  // Direct lookup
  if (BIAS_MAP[domain]) return BIAS_MAP[domain];
  // Try parent domain (e.g., "edition.cnn.com" → "cnn.com")
  const parts = domain.split('.');
  if (parts.length > 2) {
    const parent = parts.slice(-2).join('.');
    if (BIAS_MAP[parent]) return BIAS_MAP[parent];
  }
  return null;
}

/**
 * Get numeric bias score (-3 to +3). Returns 0 for unknown.
 */
export function getBiasScore(domainOrUrl: string): number {
  const profile = getSourceProfile(domainOrUrl);
  return profile ? BIAS_SCORE[profile.bias] : 0;
}

/**
 * Get numeric factuality score (1-5). Returns 3 for unknown.
 */
export function getFactualityScore(domainOrUrl: string): number {
  const profile = getSourceProfile(domainOrUrl);
  return profile ? FACTUALITY_SCORE[profile.factuality] : 3;
}

/**
 * Check if a source falls within the "unbiased" range.
 * Default: center, center-left, center-right.
 */
export function isUnbiasedSource(domainOrUrl: string, maxBias: number = 1): boolean {
  const score = Math.abs(getBiasScore(domainOrUrl));
  return score <= maxBias;
}

/**
 * CSS color for bias badge.
 */
export function getBiasColor(bias: BiasRating): string {
  switch (bias) {
    case 'center': return '#22C55E';      // green
    case 'center-left':
    case 'center-right': return '#EAB308'; // yellow
    case 'left':
    case 'right': return '#F97316';        // orange
    case 'far-left':
    case 'far-right': return '#EF4444';    // red
  }
}

export { BIAS_MAP, BIAS_SCORE, FACTUALITY_SCORE };
