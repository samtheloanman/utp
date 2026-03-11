'use client';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { hardhat, rootstockTestnet, rootstock } from 'wagmi/chains';

export const config = getDefaultConfig({
    appName: 'UTP Platform',
    projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo',
    chains: [rootstockTestnet, rootstock, hardhat],
    transports: {
        [hardhat.id]: http('http://127.0.0.1:8545'),
        [rootstockTestnet.id]: http('https://public-node.testnet.rsk.co'),
        [rootstock.id]: http('https://public-node.rsk.co'),
    },
});
