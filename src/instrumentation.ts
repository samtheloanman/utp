import { registerOTel, OTLPHttpJsonTraceExporter } from '@vercel/otel';

/** wagmi/MetaMask SDK touch localStorage at import time; give the server a no-op store. */
function polyfillServerStorage() {
  if (typeof window !== 'undefined' || typeof globalThis.localStorage !== 'undefined') return;
  const storage: Record<string, string> = {};
  const mockStorage = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); },
    get length() { return Object.keys(storage).length; },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  };
  (globalThis as Record<string, unknown>).localStorage = mockStorage;
  (globalThis as Record<string, unknown>).sessionStorage = mockStorage;
}

/**
 * Traces go to Vercel's tracing on deploys. Set OTEL_EXPORTER_OTLP_ENDPOINT
 * (e.g. the local collector, http://<host>:4318) to also ship them to our stack.
 */
export function register() {
  polyfillServerStorage();
  const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
  registerOTel({
    serviceName: 'utp',
    ...(endpoint ? { traceExporter: new OTLPHttpJsonTraceExporter({ url: `${endpoint.replace(/\/$/, '')}/v1/traces` }) } : {}),
  });
}
