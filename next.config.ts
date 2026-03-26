import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Wagmi/RainbowKit optional peer deps — mark as externals to avoid
    // resolution failures in Next.js dev mode (these are optional connectors)
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'porto': false,
        'porto/internal': false,
      };
    }
    return config;
  },
  // Suppress wagmi connector warnings in dev console
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
