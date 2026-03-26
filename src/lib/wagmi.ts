'use client';

import type { Config } from 'wagmi';

let _config: Config | null = null;

export function getConfig(): Config {
    if (!_config) {
        // Lazy import — only loads RainbowKit/wagmi when actually called client-side
        const { getDefaultConfig } = require('@rainbow-me/rainbowkit');
        const { http } = require('wagmi');
        const { hardhat, rootstockTestnet, rootstock } = require('wagmi/chains');

        _config = getDefaultConfig({
            appName: 'UTP Platform',
            projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || 'demo',
            chains: [rootstockTestnet, rootstock, hardhat],
            transports: {
                [hardhat.id]: http('http://127.0.0.1:8545'),
                [rootstockTestnet.id]: http('https://public-node.testnet.rsk.co'),
                [rootstock.id]: http('https://public-node.rsk.co'),
            },
        });
    }
    return _config!;
}
