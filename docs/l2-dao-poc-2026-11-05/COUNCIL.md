# Council review, 2026-11-05

Three independent reviewers read the first draft. No code run, nothing deployed. RPC probes were read-only.

| Finding | Reviewer | Resolution |
|---|---|---|
| Unset flag read as closed, so deploy closed voting and the "close" proposal proved nothing | Security, Delivery | Key is `CIVIC_VOTING_CLOSED`; 0 means open |
| Public Rootstock nodes lack `eth_getLogs` | Infrastructure (measured) | Use OZ `GovernorStorage`, no logs needed. Chair's choice, not suggested by reviewers |
| "Nobody else can change it" overclaims | All | Objective reworded, trust disclosed |
| RPC outage silently reopens DAO-closed voting | All | Gated votes pause on non-chain source |
| Route gate bypassable through RLS | Delivery | Disclosed, out of scope |
| Token allocation vague; deployer could vote before transfer | Security | Scripted allocation with assertions |
| Cancel window about one block | Security, Delivery | Nonzero guardian cancels queued operation |
| 2880 blocks is about 19 hours at measured 23-24 s | Infrastructure | votingPeriod 3600; wait on `state()` |
| Cancun with MCOPY documented, not execution-proven | Infrastructure | Canary contract first, with fallback |
| Wallet connect missing; client components cannot call server cache | Delivery | Task 5 connect step; `/api/app-config` route |
| Generated ABIs gitignored; `contracts.ts` unused | Delivery | Hand-written `parseAbi`; delete file |
| Upgrades and plugin claims false | Security | Spec table corrected |
| Closing production voting on a civic site is a trust risk | Infrastructure | Preview only, banner, named testers |
| Featured bill and app bytecode guard add nothing | Delivery | Cut |

Chain decision: stay on Rootstock. Governance has no bridged assets, so a rollup's settlement benefit adds little here.

Unverified: Privy embedded-wallet defaults, wagmi active-wallet sync, MCOPY on live testnet, Citrea claims, election and securities exposure (needs counsel).
