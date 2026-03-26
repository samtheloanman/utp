/**
 * Next.js Instrumentation — runs before the app starts.
 * Polyfills localStorage/sessionStorage on server to prevent
 * wagmi/RainbowKit/MetaMask SDK crashes during SSR dev mode.
 */
export async function register() {
  if (typeof window === 'undefined') {
    const storage: Record<string, string> = {};
    const mockStorage = {
      getItem: (key: string) => storage[key] ?? null,
      setItem: (key: string, value: string) => { storage[key] = value; },
      removeItem: (key: string) => { delete storage[key]; },
      clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
      get length() { return Object.keys(storage).length; },
      key: (i: number) => Object.keys(storage)[i] ?? null,
    };

    (globalThis as Record<string, unknown>).localStorage = mockStorage;
    (globalThis as Record<string, unknown>).sessionStorage = mockStorage;
  }
}
