# United Tasks Project (UTP)

## What This Is

UTP is a hybrid on/off-chain Decentralized Application leveraging an RSK L2 Bitcoin setup, focusing on stablecoin integrations backed by BTC and participatory public legislature. It enables intelligent user engagement through AI-driven debates on current events and legislation, capturing decentralized sentiment and polling data to shape organizational governance.

## Core Value

To empower users with a fully transparent, BTC-backed stablecoin ecosystem merged with informed, AI-facilitated legislative voting and polling on consequential global topics.

## Requirements

### Validated

- ✓ Base blockchain integration (RSK/EVM compatibility) — inferred
- ✓ Smart Contract structural patterns (DAO structure, Treasuries, Permissions) — inferred
- ✓ Frontend structure using Next.js 15 App Router and React 19 — inferred
- ✓ Wallet Connect integration and On-chain routing — inferred

### Active

- [ ] Implementation of a Layer 2 BTC setup with a minted stablecoin explicitly backed by BTC.
- [ ] Voting mechanism for user participation in "Legislature".
- [ ] AI Debates system where autonomous AI agents debate facts, generating pros and cons for news, legislative agendas, or global causes.
- [ ] High-engagement user polling mechanism to capture what users want on important AI-debated topics.

### Out of Scope

- [ ] Purely fiat-backed stablecoins — The MVP strictly focuses on BTC collateral to align with the RSK architecture.
- [ ] Human-only debate forums — The debate system focuses specifically on AI generating pros/cons based on facts to keep polling data objective.

## Context

- Building on RSK as an EVM-compatible Bitcoin L2.
- Uses Next.js for the core interface and Supabase for off-chain metrics/indexing.
- Existing codebase has smart contracts utilizing OpenZeppelin v5.x and Wagmi.

## Constraints

- **Web3 Stack**: Must retain RSK compatibility and use Wagmi/Viem.
- **Data Integrity**: AI debate sources must be strictly fact-checked, ensuring unbiased pros/cons generation.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stablecoin Backing | MVP requires BTC-backed stablecoin on L2 to integrate deeply with the RSK ecosystem | — Pending |
| AI Integration | Leverage LLMs to generate high-quality debates (pros/cons) ensuring polling isn't reliant on echo chambers | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-13 after initialization*
