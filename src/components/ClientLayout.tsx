'use client';

import dynamic from 'next/dynamic';
import { ReactNode } from 'react';

const Web3Provider = dynamic(
    () => import('./Web3Provider').then((mod) => mod.Web3Provider),
    { ssr: false }
);

const Sidebar = dynamic(
    () => import('./Sidebar').then((mod) => mod.Sidebar),
    { ssr: false }
);

export function ClientLayout({ children }: { children: ReactNode }) {
    return (
        <Web3Provider>
            <Sidebar />
            <main style={{
                marginLeft: 240,
                minHeight: '100vh',
                padding: '2rem',
            }}>
                {children}
            </main>
        </Web3Provider>
    );
}
