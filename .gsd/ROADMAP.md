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
- **D1 — Quantum/ZK scope for v1.** Recommended: v1 binding votes = wallet signature + ERC20Votes; ship Dilithium hybrid and ZK anonymous voting later as optional plugins once a client signer exists and RSK gas is measured. Alternative: keep hybrid PQ mandatory for v1 (adds client-side Dilithium signing + a gas-budget spike to Phase 1).
- **D2 — Initial governance parameters:** voting period, quorum %, proposal threshold, timelock delay, initial UTP distribution. Needed before Phase 2.

---

## Phase 0 — Green baseline  ·  size: S
Goal: every existing test passes and one command proves it.

- [ ] **Hybrid-vote tests (8):** `MockQuantumVerifier.verify` compares `keccak256(m)` to the signature, but the plugin already passes a hash and the test helper signs that hash → double-hash mismatch. Align the mock with the plugin's message format.
- [ ] **PluginRegistry uninstall (5):** `uninstallPlugin` calls `dao.revoke`, but the registry holds no permission on the DAO → `AccessDenied`. Fix the permission model (grant the registry a scoped revoke right, or route uninstall through DAO execution); keep it fail-closed.
- [ ] **Stablecoin suite (1):** add `contracts/test/MockPriceOracle.sol` implementing `IPriceOracle` (also unblocks `scripts/deploy.cjs`, which references it).
- [ ] `npm test` → runs `hardhat test` + `vitest run` (move `scripts/verify.js` to `npm run verify:local`).
- [ ] Commit the local-solc workaround as an opt-in (`HARDHAT_SOLC_LOCAL=1`) for offline/sandboxed CI.
- [ ] Add CI (GitHub Actions): lint, build, compile, test on every PR. (No workflows exist today.)
- [ ] Hygiene: untrack `tsconfig.tsbuildinfo`; move `UTP.zip`, `design.tar.gz`, the LMArena PDF out of git; delete empty `temp_ethdilithium/`, `temp_groth16/` if unused; delete merged branch `sync/freedom-stack-master`.

Exit: CI green on `master`; all contract tests pass (128 pass / 14 fail today; the stablecoin failure is a `beforeEach` hook, so more tests will run once fixed).

## Phase 1 — Governance correctness (the DAO voting layer)  ·  size: M
Goal: votes that are binding, contestable, time-boxed, and delayed before execution.

GovernancePlugin gaps found in review:
- [ ] **Enforce the voting window.** `startBlock`/`endBlock` are stored but never checked; votes are accepted at any time.
- [ ] **For / Against / Abstain.** Only "yes" weight is tracked today, so a proposal can't be voted down.
- [ ] **No execution on first quorum crossing.** Today `_tryExecute` runs mid-vote. Change to: voting ends → succeeded if quorum met and for > against → queued.
- [ ] **Route execution through the timelock.** `deploy.cjs` grants GovernancePlugin direct `EXECUTE` on the DAO, which bypasses the timelock. Make the timelock the only executor.
- [ ] **Proposal threshold** (min UTP to propose) and proposal descriptions/IDs (hash-based, not array index).
- [ ] **Quorum from snapshot supply** (`getPastTotalSupply`), not live `totalSupply`.
- [ ] **Don't mix units:** ZK votes add weight 1 into token-weighted totals. Separate the tally or disable ZK voting for v1 (per D1).
- [ ] Per D1: add `castVote(proposalId, support)` (wallet + ERC20Votes) as the v1 path; keep hybrid/ZK behind plugin flags.
- [ ] Remove deployer super-roles after setup: timelock admin, UTP minter, event create/resolve → DAO/timelock only.
- [ ] Carry forward red-team items: PQ downgrade with empty sig, plugin privilege escalation, replay (nonce + chainId).
- [ ] Tests: lifecycle (propose → vote → defeat/succeed → queue → execute), double-vote, late vote, threshold, timelock delay, role lockdown.
- [ ] Update `THREAT_MODEL.md` for governance + permissions.

Exit: governance + permission + plugin suites pass; no address other than the timelock can execute on the DAO.

## Phase 2 — RSK testnet deployment  ·  size: S–M
Goal: the DAO runs end to end on RSK testnet (chainId 31).

- [ ] Split `scripts/deploy.cjs` into a **governance core** deploy (DAO, PermissionManager, PluginRegistry, Treasury, UTPToken, GovernancePlugin, Timelock) and a separate **financial** deploy. No mocks on non-local networks; the script fails if any are requested.
- [ ] Set parameters from D2; distribute initial UTP to testers; delegate votes.
- [ ] Deploy, verify source on the RSK explorer, commit addresses to `deployments/rskTestnet.json`, and expose them to the app via `src/lib/contracts.ts`.
- [ ] **Build** `/governance` in the teal system (it is placeholder text today): proposal list, create proposal, vote, status, queue/execute. Every vote surface is labeled **sentiment / wallet-signed / binding**. Build `/token` (balance + delegate) alongside, since votes need delegation.
- [ ] Rehearse: failed proposal, successful proposal through timelock, emergency pause path, redeploy/rollback runbook.
- [ ] Closed testnet Alpha with a handful of wallets.

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
