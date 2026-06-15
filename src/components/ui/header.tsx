'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export const Header = () => {
  return (
    <header style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaeaea' }}>
      <h1>United Tasks Project</h1>
      <ConnectButton />
    </header>
  );
};
