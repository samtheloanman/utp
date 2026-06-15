'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TopBar } from '@/components/ui/Shared';
import { Icon } from '@/components/ui/icons';

export default function HowItWorks() {
  const router = useRouter();

  return (
    <div className="app" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <TopBar onHome={() => router.push('/')} />
      
      <main className="wrap" style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px', flex: 1 }}>
        <div style={{ marginBottom: '40px', textAlign: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', borderRadius: '50%', background: 'var(--for)', color: 'white', marginBottom: '16px' }}>
            <Icon name="shield" size={24} stroke={2} />
          </span>
          <h1 style={{ fontSize: '2.5rem', letterSpacing: '-0.03em', color: 'var(--text)' }}>How It Works</h1>
          <p style={{ fontSize: '1.2rem', color: 'var(--muted)', marginTop: '12px' }}>
            Uniting the People is a decentralized, on-chain governance platform that enables verified voices to be heard globally without intermediaries.
          </p>
        </div>

        <div className="panel panel-pad" style={{ marginBottom: '30px' }}>
          <h2>1. Core Definitions</h2>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ color: 'var(--text)', marginBottom: '4px' }}>Uniting the People</h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
                A digital public square where proposals ranging from local city ordinances to international United Nations resolutions can be voted on by verified citizens.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'var(--text)', marginBottom: '4px' }}>Shadow Voting</h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
                An independent public referendum that mirrors real-world legislative bills, allowing citizens to express sentiment transparently before or alongside official government action.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'var(--text)', marginBottom: '4px' }}>On-chain Governance</h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6' }}>
                All votes are permanently recorded to a decentralized ledger (the RSK Smart Contract Network). This guarantees that results cannot be tampered with, deleted, or manipulated by any central authority.
              </p>
            </div>
          </div>
        </div>

        <div className="panel panel-pad" style={{ marginBottom: '30px' }}>
          <h2>2. The Voting Process</h2>
          <ul style={{ paddingLeft: '20px', marginTop: '16px', color: 'var(--muted)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <li><b>Authentication:</b> Users sign in using an email address, Google account, or a native Web3 wallet.</li>
            <li><b>Wallet Provisioning:</b> For users signing in via email/social, a secure embedded wallet is provisioned automatically behind the scenes. This wallet holds the cryptographic keys needed to interact with the blockchain.</li>
            <li><b>Casting a Vote:</b> Users review the AI-synthesized, citation-grounded arguments and select 'For', 'Against', or 'Unsure'.</li>
            <li><b>On-chain Settlement:</b> The vote is signed by the user's wallet and broadcasted to the RSK Smart Contract, adding it to the immutable public tally.</li>
          </ul>
        </div>

        <div className="panel panel-pad">
          <h2>3. Frequently Asked Questions</h2>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                <Icon name="question" size={16} stroke={2} /> Is my vote really secure?
              </h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginTop: '6px' }}>
                Yes. By utilizing the RSK (Rootstock) network—a Layer 2 scaling solution secured by the Bitcoin network—every vote is cryptographically guaranteed and publicly verifiable without revealing personally identifiable information.
              </p>
            </div>
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                <Icon name="question" size={16} stroke={2} /> Do I need cryptocurrency to vote?
              </h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginTop: '6px' }}>
                No. If you sign in with an email address, our platform sponsors the transaction fees (gas) on your behalf, providing a seamless Web2 experience with Web3 security.
              </p>
            </div>
            <div>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text)' }}>
                <Icon name="question" size={16} stroke={2} /> How are the AI summaries generated?
              </h4>
              <p style={{ color: 'var(--muted)', lineHeight: '1.6', marginTop: '6px' }}>
                Our AI agents pull information exclusively from a curated registry of verified sources. Every claim in the "Citizen Digest" includes a direct citation to the original source material.
              </p>
            </div>
          </div>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 20px', borderTop: '1px solid var(--hairline)', color: 'var(--faint)' }}>
        <p>© {new Date().getFullYear()} Uniting the People. All rights reserved.</p>
      </footer>
    </div>
  );
}
