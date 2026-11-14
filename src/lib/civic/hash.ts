import { createHash } from 'node:crypto';

function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v ?? null);
}

/** SHA-256 over canonical JSON (sorted keys, no whitespace). Node runtime only. */
export function recordHash(value: Record<string, unknown>): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}
