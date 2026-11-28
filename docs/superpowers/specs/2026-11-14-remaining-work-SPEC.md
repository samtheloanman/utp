# UTP remaining work — research and acceptance spec

Target: `/Users/maysamtehranchi/Code/utp`, `feat/superpowers-civic-auth` at `28c73e8` (2026-11-14 snapshot). This is a planning baseline, not a release receipt.

## Verified baseline

- GitHub PR #22 remains open on the older `23f70bf` bundle. GitHub's consolidated branch is at `e8b86e2`.
- The writable private Forgejo staging repository `codex-utp/utp-staging` has PR #1, whose head `2b94793` adds `.forgejo/workflows/verify.yml`. Its CI status is **failure**. Independent Hermes approval has not been observed. These block promotion and merge.
- Local source validation at `28c73e8` passed `npm run ci:fast` (127 web, 181 contract tests), `npm run test:db` (31 tests), and `npm run build`. These do not replace staging CI.
- Dedicated Supabase project `tuajgdhslxqmiaehsend` has eight applied migrations and 23 RLS-enabled public tables. Auth/provider configuration and live user flows are unverified.
- Rootstock chain 31 contracts are tested locally. No funded deployer reference, four signer custody map, broadcast, or deployed DAO acceptance is verified. Quantum resistance and private voting remain research, not release claims.

## Decision protocol

For each material decision, run scoped autoresearch against live code and primary documentation; write alternatives, trust boundaries, failure modes, a minimal reversible experiment, and a measurable acceptance gate. Then run the five-lens LLM council with anonymous peer review, record disagreement and decision in `docs/superpowers/`, and implement the smallest accepted slice. Apply the Ponytail/Boost clean-code and test guards. Routine implementation details do not need a council.

## Ordered implementation decisions and gates

| Order | Decision for research and council | Smallest next slice | Acceptance |
| --- | --- | --- | --- |
| 1 | CI and review provenance: repair the failed Forgejo run, determine how independent Hermes approval is generated and verified | Diagnose run 2; fix only root cause; bind status context and protected branch rules to actual job names | Exact PR head has successful self-hosted CI and a real `hermes-utp` approval; no synthesized status |
| 2 | GitHub promotion and supersession of PR #22 | Push the verified Forgejo head to GitHub and open consolidated PR; compare old bundle before closing it | GitHub head matches staged SHA, required checks pass, reviewable diff and supersession map exist |
| 3 | Civic data coverage and authority: nationwide local/state/federal source strategy, jurisdiction matching, freshness and source attribution | One vertical slice per government level, explicit coverage gaps | Source-backed topics resolve correct jurisdiction, provenance, update time, and stale/unknown state; tests cover mismatches |
| 4 | Identity and credentials: phone, authenticator, camera proofing, OAuth/Web3 linking, wallet-local data and privacy boundaries | Threat model and one tiered enrollment/recovery path | No credential image or private key leaks; step-up, account recovery, and duplicate/personhood limitations tested |
| 5 | Legislature requests and private voting: moderation, authorship, consent, eligibility, auditability, anti-coercion | One end-to-end proposal-to-submission and ballot proof experiment | Draft/edit/submit lifecycle, abuse controls, eligibility, privacy and proof verification tested with negative cases |
| 6 | Rootstock testnet custody and DAO authority | Public signer-role manifest; secure deployer reference; funding and gas estimate; deployment rehearsal | Chain 31, four distinct controlled roles, constructor parameters, deployed bytecode, token allocation, timelock, and proposal-vote-queue-execute verified on-chain |
| 7 | Bitcoin anchoring, L2 trust model, and post-quantum design | Threat model and proof-of-concept with explicit security inheritance | Independent review demonstrates claims against real Bitcoin settlement, proof verification, exits, recovery, and algorithm migration; no mock-backed claim |

## Execution loop

Use one bounded Boost cycle per acceptance slice: observe exact revision, autoresearch spec, council the material decision, write a failing behavior test, make the smallest change, run targeted checks, review diff, then publish a receipt. Stop after two repeated identical failures. Preserve dirty submodules and unrelated generated files. External promotion, provider changes, and chain broadcasts use the authorizations already given, subject to their live gates.

## Immediate next action

Read the complete Forgejo failed job log for run 2, identify its first causal failure, and correct that single CI defect. Do not merge PR #22 while the consolidated head remains unpromoted.
