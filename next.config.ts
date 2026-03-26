import type { NextConfig } from "next";

/* ─── Server-side localStorage polyfill ─────────────────────
   wagmi/RainbowKit/MetaMask SDK access localStorage at import
   time. Since `use client` modules still get evaluated on the
   server during SSR in Next.js dev mode, we provide a no-op
   polyfill at the earliest possible point (config evaluation).
─────────────────────────────────────────────────────────────── */
if (typeof globalThis.localStorage === 'undefined') {
  const storage: Record<string, string> = {};
  const mock = {
    getItem: (key: string) => storage[key] ?? null,
    setItem: (key: string, value: string) => { storage[key] = value; },
    removeItem: (key: string) => { delete storage[key]; },
    clear: () => { Object.keys(storage).forEach(k => delete storage[k]); },
    get length() { return Object.keys(storage).length; },
    key: (i: number) => Object.keys(storage)[i] ?? null,
  };
  (globalThis as Record<string, unknown>).localStorage = mock;
  (globalThis as Record<string, unknown>).sessionStorage = mock;
}

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'porto': false,
        'porto/internal': false,
      };
    }
    return config;
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
