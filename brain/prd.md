# UtP Product Requirements Document (PRD) v2.0 - The Freedom Stack

## 1. Executive Vision
UtP is a **sovereign civic & financial infrastructure** designed for citizens in regions experiencing regime instability or hyperinflation (Iran, Venezuela, Syria, Libya).

**Core Value Proposition:**
1.  **Uncensored Truth**: AI-verified news/facts on critical topics (healthcare, rights).
2.  **Sovereign Voice**: Unstoppable voting on local and global issues.
3.  **Sound Money**: A BTC-backed stablecoin (1 unit = 10,000 sats) to preserve wealth.

## 2. Target Audience
- **Primary**: Citizens in hyperinflationary economies (Venezuela, Iran, Syria).
- **Secondary**: Diaspora communities supporting them.

## 3. Product Pillars (The MVP)

### 3.1 The Truth Engine (Source of Truth)
- **Algorithm**: Aggregates news from decentralized sources (Nostr, RSS, IPFS).
- **AI Verification**: Cross-references claims against primary data/historical fact.
- **Delivery**: Low-bandwidth, censorship-resistant text summaries.

### 3.2 The Voice Layer (Voting)
- **Topics**: Critical social issues (Abortion, Medical Benefits, Regime Actions).
- **Security**: Zero-knowledge proof (ZKP) voting to protect voter identity.
- **Storage**: Anchored on Bitcoin Layer 2 (Stacks/Rootstock) for immutability.

### 3.3 The Freedom Wallet (Financial)
- **Asset**: "UtP Stable" (10k Sats ≈ $0.60 USD).
- **Backing**: 1:1 Bitcoin collateralized on L2.
- **Utility**: P2P payments, wealth preservation, merchant acceptance.
- **Custody**: Non-custodial (users own their keys).

## 4. Technical Architecture (Revised)

- **Blockchain**: Bitcoin Layer 2 (Stacks or Rootstock).
- **Smart Contracts**: Clarity (Stacks) or Solidity (Rootstock) for the stablecoin.
- **Backend**: Supabase (User metadata, off-chain cache) + Edge Functions.
- **Frontend**: Next.js (PWA for offline-first capability).
- **AI**: Llama 3 (running on decentralized nodes) for Truth Engine.

## 5. Success Metric (North Star)
**1,000 Daily Active Wallets in target regions (Iran/Venezuela) within 90 days.**

## 6. Risks & Mitigation
- **Regime Blocking**: Use PWA, IPFS, and Tor bridges.
- **Crypto Ban**: Obfuscate traffic, focus on non-custodial wallets.
- **Oracle Failure**: Human-in-the-loop review for "Truth Engine" disputes.
