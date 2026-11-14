# UTP DAO proof of concept: specification

Date: 2026-11-05. Status: PROPOSED, council-reviewed ([COUNCIL.md](COUNCIL.md)), awaiting Sam's validation.
Plan: [../superpowers/plans/2026-11-05-utp-rootstock-dao-poc.md](../superpowers/plans/2026-11-05-utp-rootstock-dao-poc.md).
Inherits: [testnet SPEC](../testnet-readiness-2026-10-31/SPEC.md), [L2/PQ SPEC](../bitcoin-l2-pq-research-2026-11-03/SPEC.md).

## Objective

Prove on public testnet that a UTP app policy is set by its DAO: token holders pass a proposal, it waits out a real timelock, it executes, and a preview of the web app changes because of it.

No wallet can change `AppConfig` without a passed proposal. The web app is operator-hosted and could ignore it; its obedience is trusted to Vercel and the operator. This sentence goes in the evidence ledger.

This is backlog items G1 and G2, exit label `ROOTSTOCK_DAO_TESTNET_ACCEPTED`. It is not `FULL_CUSTOM_L2_TESTNET_ACCEPTED`.

## Naming honesty

Rootstock is a merge-mined Bitcoin sidechain with a PowPeg bridge, not a rollup. This POC tests governance mechanics only and provides no Bitcoin security evidence: testnet merge-mining hash power is negligible. Copy never says "Bitcoin L2" or "Bitcoin-secured". Citrea is a follow-up comparison after acceptance, unverified today.

## What "whole app on the DAO" means here

**This is a reduced reading of the request and needs Sam's sign-off.** A Next.js site cannot execute on a chain, and putting everything on chain now would publish how people vote.

| Concern | Authority in POC | Why |
|---|---|---|
| Civic voting open or closed | DAO, via `AppConfig` | This is the proof |
| Treasury | DAO | Exists on master |
| Binding proposals and votes | `GovernancePlugin` through timelock | Exists on master |
| Contract upgrades | None, contracts are immutable | No proxy exists |
| Plugin registry | Informational | Governor's real authority is the timelock PROPOSER role |
| Civic sentiment votes, bills, identity | Supabase | Linked public wallet votes expose voters; private voting is L2/PQ gate G4 |
| Hosting, code | Vercel, operator | Trusted, disclosed |

## Current vs desired

Current: Governor, Timelock, Treasury and invariant checks tested locally (175 contract tests). Never deployed publicly. `/governance` is a placeholder. First-cycle work is built but unpushed, at `23f70bf` in the bundle. Migrations unapplied.

Desired: `/governance` on a preview lists real testnet proposals; a wallet can delegate, propose, vote, queue, execute; the preview obeys on-chain `AppConfig`; receipts are recorded.

## Constraints

- Test funds and testnet-only keys only. `rskMainnet` stays absent from deploy config.
- `requireHybridAuth=false`, zero `pqVerifier`. Hybrid voting is not exposed.
- No indexer, subgraph or new dependency. The public Rootstock node has no `eth_getLogs` (measured 2026-11-05), so proposals are read through OZ `GovernorStorage` over `eth_call`.
- Production civic voting is never closed by this POC. The gate runs only where `DAO_CONFIG_GATE=1`, on preview.
- Site stays readable if the chain fails; on a gated deployment, votes pause.
- Enforcement is at the app route only. Authenticated users can still write `shadow_votes` directly through RLS. Disclosed gap, not fixed here.
- Preview banner: "Testnet demo. Test tokens have no value. Not an official or government vote. No effect on any election or legislation."
- Named, informed testers only. No value, profit or mainnet-swap language. Legal review before any public link or non-tester distribution.
- CI on Dell only. Every external mutation needs Sam's OK at that step.

## Acceptance

1. `npm run ci:fast` and `npm run build` pass at exact head, with nonzero counts recorded.
2. Chain 31, addresses and code hashes match the manifest from a second RPC. Permission and role state matches the expected set. Because the public node lacks logs, this uses `verifyCore` reads plus a keyed or dRPC log listing where available; state which ran.
3. Wallets A and B, independently controlled, neither the deployer: A proposes, and both must vote to reach quorum, from the UI, with real wall-clock time.
4. Before execution `CIVIC_VOTING_CLOSED` reads 0 and the preview shows open. After, it reads 1, the preview shows closed, the route returns 403. A direct `set` from deployer or any EOA reverts.
5. A defeated proposal and a guardian `timelock.cancel` of a queued proposal each observed on testnet.
6. Wrong chain disables writes. RPC failure shows "DAO state unavailable", never as a DAO decision, and pauses gated votes.
7. Evidence ledger holds tx hashes, SHAs, allocation, guardian, role inventory and the trust sentence above.

## Needs Sam

- Sign-off on the reduced reading above.
- Guardian: a tester-held EOA that is not the deployer, disclosed. Safe contracts exist on testnet, but UI support is unproven; a Safe is optional.
- Wallet B holder: someone other than Sam.
- Supabase project, secrets, Vercel access (parallel track, does not block the DAO proof).
