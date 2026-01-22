# UtP Product Requirements Document (PRD) v1.0

## 1. Executive Vision
UtP is an AI-first civic infrastructure that transforms how people interact with governance. V1 focuses on **Truth** (readable legislative digests) and **Polling** (shadow voting).

## 2. Hard Boundaries (Non-negotiables)
- **V1 Crypto:** ZERO. No tokens, no stablecoins, no on-chain treasury.
- **V1 Iran:** Information portal + non-binding voting. No finance flows.
- **Privacy:** Email/OAuth required. IP stored for abuse prevention but never exposed.
- **Accuracy:** AI summaries MUST contain citations or fail with `INSUFFICIENT_DATA`.

## 3. Product Features (V1)
### 3.1 Trust Portal
- **Activity Stream:** Real-time feed of Congress.gov bills and actions.
- **Citizen Digest:** AI summaries with TL;DR, impact, and direct citations.
- **Source Registry:** Public log of all API sources, health, and licensing.

### 3.2 Participation Layer
- **Shadow Voting:** "For", "Against", "Unsure" options on every bill.
- **Public Dashboard:** Aggregate sentiment vs. actual legislative outcome.

### 3.3 Public Infrastructure
- **Open API:** Read-only access to all legislative data and vote aggregates.
- **Regional Portals:** Specialized views for USA and Iran.

## 4. Technical Specifications
- **Stack:** Next.js (Frontend), Supabase (Auth/DB/API), OpenAI/Claude (Summarization).
- **Data Model:** Normalized SQL schema for high-performance civic queries.
- **Ingestion:** Idempotent, rate-limit aware workers for Congress.gov.

## 5. Success Metric (North Star)
**10,000 Shadow Votes in the first 30 days of launch.**

## 6. Future Vision: The Road to DAO on Bitcoin

While V1 focuses on **information transparency** and **participation**, the ultimate vision is a **decentralized autonomous organization (DAO) on Bitcoin**.

### Why We're Delaying Crypto to V3
1. **Regulatory Safety**: Non-profit + stablecoin + Iran = high legal risk
2. **Product-Market Fit First**: Prove people want civic transparency before building complex infrastructure
3. **Budget Reality**: $100/month can't support blockchain development

### The Bridge: Off-chain to On-chain
V1 builds the **foundation** for DAO governance:
- **Shadow Voting** → Future on-chain governance votes
- **User Accounts** → Future wallet-based identity
- **Reputation System** (V2) → Future governance token weights

### V3 DAO Architecture (12-18 months)
Once V1 proves traction (10K+ users, $5K+ MRR), we'll implement:
- **Rootstock/Stacks L2**: Bitcoin-adjacent EVM execution layer
- **Governance Primitives**: Proposal submission, voting, execution
- **BTCx Stablecoin**: Bitcoin-collateralized stable currency (pending legal clearance)
- **Treasury Management**: Community-controlled funding allocation

### Your Role
By using UtP V1, you're helping build the **civic infrastructure** that will power the first **truly decentralized global democracy**. We start with transparency. We end with sovereignty.

---
