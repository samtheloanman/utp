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
            padding: 0,
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            zIndex: 50,
        }}>
            {/* Logo Header — teal accent bar */}
            <div style={{
                padding: '1.25rem 1rem',
                borderBottom: '1px solid var(--border)',
                background: 'var(--bg-primary)',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
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
                        <div style={{
                            fontFamily: "'Bebas Neue', sans-serif",
                            fontWeight: 400,
                            fontSize: '1.3rem',
                            letterSpacing: '0.06em',
                            color: 'var(--text-primary)',
                        }}>UTP</div>
                        <div style={{
                            fontSize: '0.6rem',
                            color: 'var(--teal)',
                            letterSpacing: '0.12em',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                        }}>
                            PROTOCOL
                        </div>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 1,
                padding: '0.75rem 0.5rem',
                overflowY: 'auto',
            }}>
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
                                fontSize: '0.85rem',
                                fontWeight: isActive ? 600 : 500,
                                color: isActive ? 'var(--teal-dark)' : 'var(--text-secondary)',
                                background: isActive ? 'var(--teal-light)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                                borderLeft: isActive ? '3px solid var(--teal)' : '3px solid transparent',
                            }}
                        >
                            <span style={{ fontSize: '1rem' }}>{item.icon}</span>
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            {/* Wallet */}
            <div style={{
                borderTop: '1px solid var(--border)',
                padding: '0.75rem',
                background: 'var(--bg-primary)',
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
