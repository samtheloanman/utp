'use client';

import * as React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { rootstock, rootstockTestnet } from 'viem/chains';

export const config = createConfig({
  chains: [rootstockTestnet, rootstock],
  connectors: [injected()],
  transports: {
    [rootstockTestnet.id]: http(),
    [rootstock.id]: http(),
  },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
