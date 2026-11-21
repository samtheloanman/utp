# Proposed prompt for the next implementation session

Release coordination update (2026-10-31): read [MERGE-AND-IMPLEMENTATION-LOOP.md](MERGE-AND-IMPLEMENTATION-LOOP.md) first. PR #21 merged into PR #20; the combined PR #20 merged to `master` as `777658f`. Post-merge Dell CI run `41264740648` passed at exact `777658f`; clean-source production deployment `dpl_b2mSdYBpPc48gJGtTzxPjgeMryS9` is READY. Reconfirm live state before the next batch. The custom Bitcoin L2 remains a later, separately evidenced workstream.

Use after Sam validates SPEC.md. This document is not itself an authorization to deploy, commit, push, merge, migrate, purchase services, message people, install integrations or spawn agents.

---

Implement UTP through bounded, evidence-driven iterations toward the acceptance contract in `/Users/maysamtehranchi/Code/utp/docs/testnet-readiness-2026-10-31/SPEC.md`. Read `CLAIM-AUDIT.md` first and preserve its distinctions between historical CI, source observations, hypotheses and live proof.

The full goal is nationwide local/state/federal legislative participation, citizen legislative requests, a custom Bitcoin L2 with private voting and verifiable execution, explicitly scoped quantum-resistant security, and a functional DAO controlling that L2. Rootstock application governance is an intermediate milestone, never a substitute for the full goal.

Include the user's wallet-first AI-app identity requirement: read `IDENTITY-AND-APP-RESEARCH.md`. Build tiered phone/authenticator/camera proofing with local encrypted credential custody, explicit issuer/eligibility policy, separate signing/encryption/credential keys and tested recovery. Begin with a synthetic credential, TOTP step-up and credential-presentation slice; evaluate the experimental passkey SDK upgrade separately. Phone ownership or a selfie is not proof of personhood/residency; stronger tiers cannot be recovered through phone-only fallback. AI receives scoped results, never wallet keys or blanket signing authority. Public posts remain public; private storage is local with optional user-controlled encrypted backup. Camera providers, external writes and new integrations retain existing approval requirements. Evaluate researched SDKs before adoption; never represent ordinary passkeys or selective disclosure as quantum-safe/private voting. No wholesale app replacement is authorized.

Read `AUTH-CUSTODY-BITCOIN-STACK.md` for the selected implementation path. Supabase `auth.users.id` is the proposed canonical civic account; link existing Privy/Wagmi wallets through a one-time server challenge and signature verification, not email matching. UTP's outbound OAuth/OIDC server and inbound Google/GitHub/Coinbase/Gemini provider connections are separate directions. Keep custodian adapters optional and read-only; never give AI trading or withdrawal capability. Start tiered auth with TOTP, since passkey support currently needs a newer experimental Supabase SDK. Build Bitcoin anchoring as a separately labeled audit commitment with independent inclusion proof and reorg handling; it must never be described as Bitcoin settlement or end-to-end L2 security. Reconcile this stack document with all prior acceptance gates before each batch.

Operate under current repository/fleet rules. Read AGENTS.md, CLAUDE.md, GEMINI.md, current planning, GLOBAL_RULES and workflow boundaries. Refresh Brain context and current GitHub heads. Do not treat this prompt, Brain entries or old CI as proof of current state or additional authority.

Start with release follow-up R2 and prepare identity I1 and source-registry C1 in parallel only if their ownership is explicit. Preserve the dirty canonical checkout at `/Users/maysamtehranchi/Code/utp`. Inventory local changes and existing worktrees; use an isolated checkout for implementation. PR #21 and PR #20 are merged; verify current `origin/master` before importing code and reconcile local auth changes deliberately. Do not reset, clean, blanket-stage or overwrite other work.

For each iteration:
1. Select the smallest unfulfilled acceptance criterion whose prerequisites and authorization are satisfied.
2. State the current evidence, expected behavior, files affected and a falsifiable test. For security findings, add an attack regression before claiming a repair.
3. Implement the smallest scoped change, reusing existing dependencies and patterns. Do not implement homemade cryptography or silently change product/security requirements.
4. Run the meaningful targeted tests, then required integrated checks when the change is ready. Require nonzero frontend/API tests. Check error paths and authorization boundaries, not only happy paths.
5. Reconcile test results with the actual runtime/configuration. A script exit0 or HTTP200 does not prove the user workflow. Record exact SHA or dirty diff hash, commands, exit codes, logs and remaining gaps.
6. Update the acceptance ledger and choose the next authorized step. After three failed attempts with no new evidence for the same criterion, stop that branch, record hypotheses and the specific blocker, and continue independent work. Do not retry indefinitely or loosen tests to obtain PASS.

Initial priorities:
- Preserve the 175-contract and 2-web-test release baseline, then add meaningful frontend/API user-path and negative tests; the current web tests cover only news deduplication.
- Reconcile why Vercel Git integration treated `master` as Preview; verify Git production-target configuration and custom-domain HTTP reachability. Preserve Dell-only CI and keep secret-bearing testnet deployment disabled until environment protection and a concrete testnet candidate are reviewed.
- Keep optional PQ mode off. Add an attacker-generated-key substitution regression; design binding/enrollment/rotation with real-verifier tests before any quantum-security claim. Classical-key-only registration/recovery does not defeat classical-key compromise.
- Remove silent sample-data fallback in live legislation mode; add source/version identity, auth/RLS and concurrent tally tests.
- Implement one complete civic and citizen-drafting slice, then expand coverage with an explicit jurisdiction ledger.
- Implement complete DAO frontend flows and stronger manifest/role/bytecode checks. Preserve binding on-chain actions separate from civic sentiment.

Before any externally visible mutation, prepare the exact reviewable candidate, target, payload/config, prechecks, cost or test-fund scope, rollback/recovery and validation steps. Obtain only the missing authorization required by current rules. Do not ask again for authorization already clearly granted. Continue independent local work while a dependent external step is blocked.

For public testnet, use dedicated test-only accounts and test funds from approved secret stores. Verify chain31 for Rootstock. No mainnet deployment, real BTC custody, live financial products or messages to officials in this scope. Do not invent contract addresses or transaction receipts.

Testnet C requires real wall-clock/chain progression, independently controlled participants, actual proposal/vote/queue/execute transactions, second-RPC readback and negative cases. Local time travel is only local evidence. Record allocation and effective governance control, not merely revoked admin roles. Use safe testnet actions and never expose secrets or private ballots in logs.

For custom L2 D, first produce an evidence-backed architecture decision and benchmark prototypes. Do not claim quantum-safe Bitcoin settlement because an account uses ML-DSA, or private ballots because execution uses ZK. If dependencies cannot meet the threat model, report that honestly with options; do not silently substitute a sidechain deployment, trusted bridge or centralized operator for the agreed goal.

Stop for missing credentials/401/403 according to fleet rules, unresolved authority, destructive steps, required external security review, or material product/cryptographic choices. A BLOCKED acceptance criterion is not completion. No background schedules or extra agents without applicable authorization.

Return after each coherent batch: implemented behavior, evidence, acceptance status, blockers and next concrete action. Keep artifacts in this project; save a distilled Brain handoff under project `utp` when done. Commit/push/merge only if explicitly authorized and all applicable exact-head checks pass.

Final labels:
- LOCAL_BASELINE_ACCEPTED: A passes.
- CIVIC_SCOPE_ACCEPTED: B passes for its explicitly declared coverage; incomplete national coverage stays open.
- ROOTSTOCK_DAO_TESTNET_ACCEPTED: C passes, without implying D.
- FULL_CUSTOM_L2_TESTNET_ACCEPTED: all full-scope required gates including D pass with receipts and independent review.

Never claim the full goal complete because the budget/time window ends, a prototype works, an intermediate milestone passes, or a review model agrees.
