# UtP Project

Last reviewed: 2026-10-18 PT

## Core Value

Build a DAO-first civic trust and financial coordination platform where source-backed evidence informs governance, and financial modules remain controlled by explicit permissions, testing, and compliance gates.

## Active Product

- Civic issue and evidence feed.
- Wallet-linked participation.
- DAO proposals, permissions, plugins, and treasury execution.
- On-chain and off-chain voting modes.
- Gated stablecoin, vault, token, and event-market modules.

## Current Priority

Deploy a binding, token-weighted voting DAO to RSK testnet. Order (see `.gsd/ROADMAP.md`):

1. Phase 0 — green baseline (14 failing tests, CI).
2. Phase 1 — governance correctness (voting window, for/against, timelock-only execution).
3. Phase 2 — RSK testnet deploy + `/governance` UI.
Civic evidence runs in parallel; financial modules stay gated.

## Non-Negotiables

- DAO permissions and treasury actions fail closed.
- Trusted AI output includes citations or fails safely.
- User keys remain client-side.
- Financial features are not presented as live until configured, tested, and approved.
- Each GSD loop ends with verification, state updates, and an intentional commit.
