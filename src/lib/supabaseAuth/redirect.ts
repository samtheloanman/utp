const PROBE_ORIGIN = 'http://x.invalid';
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/;

function isSafe(value: string): boolean {
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('\\') || CONTROL_CHARS.test(value)) return false;
  try {
    return new URL(value, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/**
 * Returns a same-origin path (+search+hash) or '/'. Callers build URLs as
 * `new URL(safe, origin)`.
 */
export function safeRedirectPath(raw: string | null | undefined): string {
  if (typeof raw !== 'string' || raw === '') return '/';
  if (!isSafe(raw)) return '/';

  // Decode once and re-check so encoded slashes/backslashes cannot smuggle
  // a protocol-relative URL past the first check.
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return '/';
  }
  if (!isSafe(decoded)) return '/';

  return raw;
}
