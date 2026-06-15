import { http, createConfig } from 'wagmi';
import { mainnet, rsk, rskTestnet } from 'wagmi/chains';
import { coinbaseWallet, injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [mainnet, rsk, rskTestnet],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'United Tasks Project' }),
    walletConnect({ projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID! }),
  ],
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [rsk.id]: http(),
    [rskTestnet.id]: http(),
  },
});