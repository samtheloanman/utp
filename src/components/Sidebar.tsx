'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';

const NAV_ITEMS = [
    { href: '/', label: 'Overview', icon: '⚡' },
    { href: '/governance', label: 'Governance', icon: '🏛️' },
    { href: '/events', label: 'Events', icon: '📊' },
    { href: '/stablecoin', label: 'UBTC', icon: '🪙' },
    { href: '/token', label: 'UTP Token', icon: '🔶' },
    { href: '/news', label: 'News', icon: '📰' },
    { href: '/legislature', label: 'Legislature', icon: '⚖️' },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            width: 240,
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: '1.25rem 0.75rem',
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            zIndex: 50,
        }}>
            {/* Logo */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0 0.5rem 1.25rem',
                borderBottom: '1px solid var(--border)',
                marginBottom: '1rem',
            }}>
                <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    background: 'linear-gradient(135deg, var(--btc-orange), var(--btc-orange-light))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1rem',
                    color: '#000',
                }}>
                    U
                </div>
                <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.02em' }}>UTP</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                        PROTOCOL
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href ||
                        (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.875rem',
                                fontWeight: isActive ? 600 : 400,
                                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--btc-orange-dim)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>{item.icon}</span>
                            {item.label}
                            {isActive && (
                                <div style={{
                                    width: 3,
                                    height: 16,
                                    borderRadius: 2,
                                    background: 'var(--btc-orange)',
                                    marginLeft: 'auto',
                                }} />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Wallet */}
            <div style={{
                borderTop: '1px solid var(--border)',
                paddingTop: '1rem',
            }}>
                <ConnectButton
                    accountStatus="avatar"
                    chainStatus="icon"
                    showBalance={false}
                />
            </div>
        </aside>
    );
}
