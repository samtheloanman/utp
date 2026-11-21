export const DEFAULT_TIMEOUT_MS = 8000;

/** Combine an optional caller signal with a timeout signal. */
export function withTimeout(signal: AbortSignal | undefined, timeoutMs = DEFAULT_TIMEOUT_MS): AbortSignal {
  const t = AbortSignal.timeout(timeoutMs);
  return signal ? AbortSignal.any([signal, t]) : t;
}
