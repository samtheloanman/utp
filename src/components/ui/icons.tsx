import React from 'react';

export const ICON_PATHS: Record<string, string> = {
  /* scales */
  layers:   '<path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 18 9 5 9-5" opacity=".5"/>',
  local:    '<path d="M3 21h18"/><path d="M5 21V8l5-3 5 3v13"/><path d="M19 21v-8l-4-2.4"/><path d="M9 21v-4h2v4"/><path d="M9 12h.01M13 12h.01M9 9h.01"/>',
  regional: '<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2-6-2Z"/><path d="M9 4v14M15 6v14"/>',
  national: '<path d="M3 21h18"/><path d="M5 21V10M19 21V10M9 21V10M15 21V10"/><path d="M3 10h18L12 3 3 10Z"/>',
  global:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>',
  /* categories */
  Climate:    '<path d="M12 2C8 6 6 9 6 13a6 6 0 0 0 12 0c0-4-2-7-6-11Z"/><path d="M12 22v-6"/>',
  Health:     '<path d="M3 12h4l2-5 3 9 2-4h7"/>',
  Economy:    '<path d="M3 17l5-5 4 3 8-9"/><path d="M16 6h5v5"/>',
  Rights:     '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7 2.5 14a3 3 0 0 0 5 0L5 7Z"/><path d="M19 7l-2.5 7a3 3 0 0 0 5 0L19 7Z"/><path d="M8 21h8"/>',
  Technology: '<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3"/><rect x="10" y="10" width="4" height="4" rx=".5"/>',
  Governance: '<path d="M3 21h18"/><path d="M5 21V10M19 21V10M9 21V10M15 21V10"/><path d="M3 10h18L12 3 3 10Z"/>',
  Education:  '<path d="M12 4 2 9l10 5 10-5-10-5Z"/><path d="M6 11v5c0 1 2.7 2.5 6 2.5s6-1.5 6-2.5v-5"/>',
  /* sources */
  globe:    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18"/>',
  chart:    '<path d="M4 4v16h16"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/>',
  doc:      '<path d="M6 2h8l4 4v16H6V2Z"/><path d="M14 2v4h4"/><path d="M9 12h6M9 16h6"/>',
  science:  '<path d="M9 3h6M10 3v6l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3"/><path d="M7.5 15h9"/>',
  water:    '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11Z"/>',
  law:      '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7 2.5 14a3 3 0 0 0 5 0L5 7Z"/><path d="M19 7l-2.5 7a3 3 0 0 0 5 0L19 7Z"/><path d="M8 21h8"/>',
  gov:      '<path d="M3 21h18"/><path d="M5 21V10M19 21V10M9 21V10M15 21V10"/><path d="M3 10h18L12 3 3 10Z"/>',
  money:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5a2.5 2 0 0 1 5 0c0 2.5-5 1.5-5 4a2.5 2 0 0 0 5 0"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  recycle:  '<path d="M7 19h10l-2 3"/><path d="m4 14 3 5-4 1"/><path d="M9 4 7 7l-4-1"/><path d="m12 3 4 7 3-1"/><path d="M20 13l-2 6"/>',
  book:     '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z"/><path d="M5 18a2 2 0 0 0 2 2h11"/><path d="M9 8h6M9 11h6"/>',
  transit:  '<rect x="5" y="3" width="14" height="13" rx="2"/><path d="M5 11h14"/><path d="M8 19l-2 2M16 19l2 2"/><circle cx="8.5" cy="14" r=".6"/><circle cx="15.5" cy="14" r=".6"/>',
  /* UI */
  search:   '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  check:    '<path d="M4 12l5 5L20 6"/>',
  up:       '<path d="M12 19V5M5 12l7-7 7 7"/>',
  down:     '<path d="M12 5v14M5 12l7 7 7-7"/>',
  question: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 0 1 4.5 1.5c0 1.7-2 2-2 3.5"/><path d="M12 17h.01"/>',
  arrowRight:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 18l-6-6 6-6"/>',
  clock:    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users:    '<path d="M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9.5" cy="8" r="3.2"/><path d="M21 19v-1a4 4 0 0 0-3-3.8"/><path d="M15 5.2a3.2 3.2 0 0 1 0 5.6"/>',
  spark:    '<path d="M12 3l1.8 4.7L18.5 9l-4.7 1.3L12 15l-1.8-4.7L5.5 9l4.7-1.3L12 3Z"/><path d="M19 14l.7 2 .3.7-2 .7.7 2"/>',
  shield:   '<path d="M12 3 5 6v5c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z"/><path d="m9.5 12 1.8 1.8L15 10"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
  bolt:     '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/>',
  filter:   '<path d="M3 5h18l-7 8v6l-4-2v-4L3 5Z"/>',
  dot:      '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  pin:      '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z"/><circle cx="12" cy="10" r="2.5"/>',
  flag:     '<path d="M5 21V4M5 4c3-1.5 6 1.5 9 0v9c-3 1.5-6-1.5-9 0"/>',
  trending: '<path d="M3 17l6-6 4 3 8-9"/><path d="M16 5h5v5"/>',
};

export const CAT_COLOR: Record<string, string> = {
  Climate:    '#1F9D6B',
  Health:     '#E0524D',
  Economy:    '#C9952F',
  Rights:     '#7A5BD0',
  Technology: '#17A6C8',
  Governance: '#0E7C96',
  Education:  '#3F73D8',
};

export interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  fill?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function Icon({ name, size = 18, stroke = 1.8, fill = false, style, className }: IconProps) {
  const inner = ICON_PATHS[name] || ICON_PATHS.dot;
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={stroke} 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={className} 
      style={style}
      dangerouslySetInnerHTML={{ __html: inner }} 
    />
  );
}

export function BrandMark({ size = 34, reversed = false }: { size?: number, reversed?: boolean }) {
  const ring = reversed ? '#ffffff' : 'var(--ring, #0E7C96)';
  const sA = reversed ? '#BFEAF3' : 'var(--sphA, #17A6C8)';
  const sB = reversed ? '#6FD9EC' : 'var(--sphB, #6FD9EC)';
  return (
    <svg width={size} height={size} viewBox="0 0 240 240" style={{ display: 'block' }} aria-hidden="true">
      <circle cx="94" cy="148" r="30" fill={sB} />
      <circle cx="120" cy="120" r="80" fill="none" stroke={ring} strokeWidth="26" />
      <circle cx="146" cy="92" r="30" fill={sA} />
    </svg>
  );
}

export function Flag({ cc, size = 18, round = true }: { cc?: string, size?: number, round?: boolean }) {
  if (!cc) {
    return (
      <span className="flag-globe" style={{ width: size, height: size, display: 'inline-flex' }}>
        <Icon name="globe" size={Math.round(size * 0.78)} stroke={1.7} />
      </span>
    );
  }
  
  const flagUrl = (code: string, width: number) => `https://flagcdn.com/w${width}/${code}.png`;
  
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img 
      className="flag-img" 
      src={flagUrl(cc, 80)} 
      alt=""
      style={{ width: size, height: round ? size : Math.round(size * 0.72), borderRadius: round ? '50%' : 3 }}
      loading="lazy" 
      referrerPolicy="no-referrer" 
    />
  );
}
