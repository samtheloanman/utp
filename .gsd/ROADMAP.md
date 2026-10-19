# UtP Roadmap — the single source of truth

Last reviewed: 2026-10-18 PT · Supersedes `brain/roadmap.md` and everything in `archive/planning-v1/`.
Status lives in `.gsd/STATE.md`. Product intent lives in `brain/prd.md`. Brand lives in `DESIGN.md`.

## North star
Ship a **binding, token-weighted voting DAO on Rootstock (RSK) testnet**, with civic evidence attached to every proposal. Then harden it for mainnet. Financial modules stay gated behind it.

## What changed in this revision (and why)
1. **Governance now comes before civic evidence.** The deployable DAO is the goal. Civic evidence becomes a parallel track that doesn't block it.
2. **Testnet deploy is its own phase**, right after governance is correct. Before, it was buried at the end next to mainnet.
3. **Governance correctness is a real phase, not "make tests green."** Code review found design gaps that tests don't cover (below).
4. **Post-quantum and ZK voting move to a research track** (pending Decision D1). The current "hybrid" vote needs a client-side Dilithium signer that doesn't exist, plus on-chain Dilithium verification whose RSK gas cost is unmeasured. The MVP binding vote is a standard wallet (ECDSA) plus ERC20Votes snapshot.
5. **The dark uBTC `/launch` and `/vault` pages are retired** (see `archive/design-dark-v1/`). Any future vault UI is rebuilt in teal with an explicit gated state.
6. **Reality check on the frontend:** `/governance`, `/token`, `/stablecoin`, `/events`, `/news`, `/legislature` are placeholder text only, despite the PRD listing them as baseline. Real UI exists for `/`, `/issue/[id]`, `/how-it-works`, `/us/california/[bill]`.
7. **Stale/false planning artifacts archived**, including a validation doc that marked the failing stablecoin suite "COMPLIANT."

## Open decisions
- **D1 — Quantum/ZK scope for v1.** ✅ Decided 2026-10-18: standard wallet voting for v1; PQ hybrid optional/off; ZK deferred. Recommended: v1 binding votes = wallet signature + ERC20Votes; ship Dilithium hybrid and ZK anonymous voting later as optional plugins once a client signer exists and RSK gas is measured. Alternative: keep hybrid PQ mandatory for v1 (adds client-side Dilithium signing + a gas-budget spike to Phase 1).
- **D2 — Initial governance parameters:** ✅ Testnet defaults set in `scripts/deploy.config.cjs` (revisit before mainnet). voting period, quorum %, proposal threshold, timelock delay, initial UTP distribution. Needed before Phase 2.

---

## Phase 0 — Green baseline  ·  ✅ DONE 2026-10-18
- [x] Hybrid-vote tests: mock verifier aligned with the plugin's message format.
- [x] PluginRegistry uninstall: new narrow `UNINSTALL_PLUGIN_PERMISSION` + `DAO.revokePluginExecute`; registry never holds ROOT; fail-closed tests.
- [x] `MockPriceOracle` added. Unmasked 9 more stablecoin tests: setup never whitelisted minters (`grantMinterRole`); fixed + minter-gating tests.
- [x] `npm test` = contracts + web; obsolete `scripts/verify.js` removed.
- [x] Offline compile opt-in: `SOLC_JS_PATH`.
- [x] CI: `.github/workflows/ci.yml` (lint, typecheck, build, compile, tests).
- [x] `npm run compile` no longer clobbers `src/lib/contracts.ts` (ABIs → `src/lib/generated/abis.ts`).
- [ ] Hygiene: ~~untrack `tsconfig.tsbuildinfo`~~ (done); move `UTP.zip`, `design.tar.gz`, LMArena PDF out of git; remove `temp_*` dirs; delete branch `sync/freedom-stack-master`.

## Phase 1 — Governance correctness  ·  ✅ DONE 2026-10-18
Rebuilt `GovernancePlugin` on OpenZeppelin Governor; replaced the custom timelock (its `CANCELLER_ROLE` could never be granted) with `UtPTimelock` over OZ `TimelockController`.
- [x] Voting window enforced (`votingDelay`, `votingPeriod`).
- [x] For / Against / Abstain; defeated proposals can never be queued.
- [x] Outcome decided at end of vote; no mid-vote execution.
- [x] Execution only through the timelock; governance holds no DAO permissions; timelock self-administered.
- [x] Proposal threshold; quorum from snapshot supply.
- [x] ZK voting removed for v1; PQ hybrid kept as an optional mode (default off), enforced in `_castVote` (no downgrade via `castVote`/`castVoteBySig`); digest binds proposal, voter, support, contract, chainId.
- [x] Deployer privileges removed at end of deploy; 11 invariants asserted by `verifyCore`.
- [x] Optional guardian = timelock canceller only (emergency veto).
- [x] Tests: 175 passing (lifecycle, defeat, quorum, abstain, snapshot, double vote, window, threshold, timelock, guardian, lockdown, hybrid mode, end-to-end treasury/mint/pause/plugin flows).
- [x] `THREAT_MODEL.md`: governance core section with threat → mitigation → test map.
- Finding: `ZKNOX_ethdilithium.sol` is an interface only (0 bytes) and upstream is marked "not audited, do not use in production". There is no real on-chain PQ verifier.

## Phase 2 — RSK testnet deployment  ·  🟡 IN PROGRESS
Goal: the DAO runs end to end on RSK testnet (chainId 31).

- [x] `scripts/deploy.cjs` deploys the governance core only (DAO, UTPToken, UtPTimelock, GovernancePlugin, Treasury, PluginRegistry) via shared `scripts/lib/deploy-core.cjs`; preflight (chainId, balance), refuses mocks off-local, refuses mainnet; full transcript to `deployments/logs/`.
- [x] D2 testnet parameters in `scripts/deploy.config.cjs`: delay 1 block, period 2880 blocks (~1 day), threshold 10,000 UTP, quorum 4%, timelock 1h.
- [x] Rehearsed: in-process deploy + live-RPC deploy on a local node + `scripts/smoke-governance.cjs` full lifecycle (propose → vote → queue → timelock → execute) — all green, 0 reverts in node log.
- [x] `.github/workflows/deploy-rsk-testnet.yml`: manual, gated on tests + rehearsal, deploys, runs read-only smoke, uploads record + logs.
- [ ] **Run the deploy** (needs `rsk-testnet` environment secret `DEPLOYER_PRIVATE_KEY`, funded with tRBTC). Commit `deployments/rskTestnet.json`.
- [ ] Verify source on the RSK explorer.
- [ ] Distribute UTP to testers and have them delegate (deployer holds 100% at deploy — it alone exceeds quorum until distributed).
- [ ] Separate financial deploy script (Phase 4 modules).
- [ ] **Build** `/governance` and `/token` in the teal system (placeholders today); label every vote surface sentiment / wallet-signed / binding.
- [ ] Runbook: deploy, verify, guardian veto, redeploy.
- [ ] Closed testnet Alpha.

Exit: one real proposal executed through the timelock on testnet; runbook written.

## Civic evidence track (parallel to Phases 1–2)  ·  size: M
Goal: every proposal and issue is traceable to sources. Doesn't block the testnet deploy.

- [ ] Source registry + trust metadata; idempotent ingestion (oracle discoverer/ingestor, legislature, news).
- [ ] Citation-required summaries and debate output; uncited output labeled unverified or rejected.
- [ ] Separate facts / generated analysis / community sentiment in the UI.
- [ ] Link proposals ↔ issues (proposal description carries issue ID + evidence hash).
- [ ] Shadow (off-chain) polling stays as the sentiment layer; `UTPPolling` remains non-binding.

## Phase 3 — Mainnet readiness  ·  size: M
- [ ] External audit of governance core; resolve or formally accept findings.
- [ ] Accessibility + performance gates; API rate limits, logging, alerts.
- [ ] Privy production config; Playwright E2E for login → wallet → vote → execute.
- [ ] Mainnet deploy (RSK chainId 30) of governance core only; monitored, reversible.

## Phase 4 — Financial modules (gated)  ·  size: L
- [ ] Stablecoin/UBTC, treasury, event markets: full tests, oracle staleness, mint/burn limits, pause.
- [ ] Vault/stablecoin/token UI rebuilt in the teal system with explicit **not live / gated** states. No placeholder addresses or "verified" badges.
- [ ] Legal, sanctions, custody, and money-transmission review before any public enablement.

## Research / deferred (not scheduled)
- Post-quantum hybrid voting (Dilithium): client signer, RSK gas measurement, plugin packaging.
- ZK anonymous voting (Semaphore/MACI-style) with a separate tally.
- AI debate personas, prediction markets, sub-DAO launcher, recursive-trust tokenomics.

## Loop (per task)
Branch → smallest complete change → tests → phase gate → update `.gsd/STATE.md` → commit → PR.
