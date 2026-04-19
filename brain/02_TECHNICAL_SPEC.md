# UtP Technical Specification v2.0 - The Freedom Stack

## Architecture Overview

### Technology Stack (Pivot to BTC L2)
- **Layer 2**: Stacks (Bitcoin Smart Contracts)
- **Contract Language**: Clarity
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS (PWA Optimized)
- **Identity**: BNS (Bitcoin Name System) or decentralized DID
- **Database**: Supabase (Off-chain cache & metadata)
- **AI**: Ollama (Llama 3) for "Truth Engine" summarization

### Core Components

#### 1. The Stablecoin Contract (10k Sats)
- **Name**: `utp-stable-v1`
- **Peg**: 1 Token = 10,000 Satoshis (micro-BTC)
- **Mechanism**: 
  - User deposits BTC -> Smart Contract locks BTC -> Mints UtP Token.
  - User burns UtP Token -> Smart Contract unlocks BTC -> Sends to User.
- **Oracles**: Chainlink or Stacks Oracle for BTC price feeds (if needed for USD peg reference, though direct backing is preferred).

#### 2. The Truth Engine (AI Pipeline)
- **Input**: RSS feeds, Nostr relays, Telegram channels (white-listed).
- **Processing**:
  1.  **Ingest**: Fetch raw text.
  2.  **Verify**: AI cross-reference with historical facts.
  3.  **Summarize**: Generate neutral, factual summary.
  4.  **Publish**: Store hash on-chain, content on IPFS/Supabase.

#### 3. Voting System
- **Proposal**: Smart contract entry.
- **Vote**: Transaction signing (Stacks wallet).
- **Privacy**: Confidential Transactions or ZK-Rollup (future). MVP: Pseudonymous (wallet address).

### Database Schema (Supabase - Revised)

```sql
-- Truth Engine Sources
CREATE TABLE sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    trust_score FLOAT DEFAULT 0.5,
    region TEXT CHECK (region IN ('iran', 'venezuela', 'syria', 'global'))
);

-- Fact Checks / News Items
CREATE TABLE news_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES sources(id),
    title TEXT NOT NULL,
    original_url TEXT,
    summary_ai TEXT,
    fact_rating TEXT CHECK (fact_rating IN ('verified', 'disputed', 'debunked')),
    on_chain_hash TEXT, -- Anchor to BTC L2
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wallet Mapping (Optional - Privacy Sensitive)
CREATE TABLE user_wallets (
    user_id UUID REFERENCES auth.users(id),
    stacks_address TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Security Considerations
- **OpSec**: Do NOT store IP addresses for users in target regions.
- **Encryption**: End-to-End encryption for any private messaging.
- **Key Management**: Client-side only. We never see private keys.
