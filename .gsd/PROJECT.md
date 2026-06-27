# UtP Project

Last reviewed: 2026-06-25 PT

## Core Value

Build a DAO-first civic trust and financial coordination platform where source-backed evidence informs governance, and financial modules remain controlled by explicit permissions, testing, and compliance gates.

## Active Product

- Civic issue and evidence feed.
- Wallet-linked participation.
- DAO proposals, permissions, plugins, and treasury execution.
- On-chain and off-chain voting modes.
- Gated stablecoin, vault, token, and event-market modules.

## Current Priority

Stabilize the existing default-branch implementation before adding product scope:

1. Fix 14 failing contract tests.
2. Repair the project test command.
3. Triage dependency and build warnings.
4. Establish a green CI baseline.

## Non-Negotiables

- DAO permissions and treasury actions fail closed.
- Trusted AI output includes citations or fails safely.
- User keys remain client-side.
- Financial features are not presented as live until configured, tested, and approved.
- Each GSD loop ends with verification, state updates, and an intentional commit.
