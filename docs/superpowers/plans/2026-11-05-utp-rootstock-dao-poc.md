# UTP Rootstock DAO Proof of Concept Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A passed, timelocked DAO proposal on Rootstock testnet changes a UTP preview's behavior. No wallet can change `AppConfig` without a passed proposal; the app's obedience is trusted to Vercel and its operator.

**Architecture:** Reuse `deployCore`. Add `GovernorStorage` to `GovernancePlugin` so proposals are readable without logs, and one small DAO-owned `AppConfig`. A cached API route reads config through viem; `/governance` drives the lifecycle through wagmi and Privy.

**Tech Stack:** Solidity 0.8.24, Hardhat, OpenZeppelin 5, Next.js, viem, wagmi, Privy, Vitest. Rootstock testnet, chain ID 31.

**Spec:** `docs/l2-dao-poc-2026-11-05/SPEC.md`

## Global Constraints

- Base tasks on `feat/first-cycle-auth-civic` once pushed. Never reset or overwrite the dirty checkout at `~/Code/utp`; work in a worktree.
- Testnet only. `deploy.config.cjs` keeps no `rskMainnet` entry.
- Accepted-run parameters: votingDelay 1, votingPeriod 3600 blocks, quorum 4%, proposalThreshold 10000 UTP, timelockMinDelay 3600. Re-measure block time before deploy. Rehearsal uses its own config and manifest.
- Allocation: A 250,000, B 250,000, Treasury 9,500,000, deployer 0. Quorum 400,000 needs both voters.
- No new dependencies, indexer or subgraph.
- Copy says "Rootstock testnet" and "test tokens". Never "Bitcoin L2", "Bitcoin-secured", "quantum-safe", "private vote" or "verified".
- Hybrid PQ voting is not exposed. The DAO gate runs only where `DAO_CONFIG_GATE=1`; production never sets it.
- CI on Dell only. Deploys, pushes, secrets and migrations each need Sam's explicit OK. No keys in logs, Brain or the ledger.

## Review Focus

- Wallet on the wrong chain clicks a write: expect disabled button and switch prompt, no transaction. Task 5.
- RPC down, slow or returning "method not available": expect "DAO state unavailable", page renders, gated votes 503, and no default cached. Task 4.
- Email or Google login with no wallet opens `/governance`: expect a wallet connect prompt, not a crash. Task 5.
- Holder has tokens but has not delegated: expect zero voting power shown and a delegate prompt. Task 5.
- Proposal not from the template appears on chain: expect "Unrecognized proposal" with raw target shown and no friendly label. Task 5.

---

## Task 0: Land first-cycle branch (Sam's approvals)

**Files:** none new. Evidence: `docs/testnet-readiness-2026-10-31/EVIDENCE.json`.

- [ ] **Step 1: After Sam's OK, push** from `utp-first-cycle.bundle` through a clean worktree, verify head `23f70bf`, open PR, get exact-head Dell CI green. Tasks 1-3 may build on this pushed branch.
- [ ] **Step 2: Parallel track, not blocking the DAO proof:** Sam picks Supabase project; run duplicate-link and column checks read-only; apply four migrations; rerun DB flows there; set `WALLET_LINK_SECRET`, Congress.gov key, OpenStates key, `IP_SALT`; grant Vercel access and resolve Preview builds on `master`.
- [ ] **Step 3: Merge** with `--match-head-commit` after green, and smoke production.

## Task 1: AppConfig and readable proposals

**Files:**
- Create: `contracts/core/AppConfig.sol`, `test/core/AppConfig.test.js`
- Modify: `contracts/plugins/GovernancePlugin.sol`, `test/plugins/GovernancePlugin.test.js`

**Interfaces:**
- Produces: `constructor(address dao)`, `dao() view`, `set(bytes32 key, bytes32 value)` onlyDAO, `get(bytes32 key) view returns (bytes32)`, `event ConfigSet(bytes32 indexed key, bytes32 value)`, `error Unauthorized()`.
- Produces: key `keccak256("CIVIC_VOTING_CLOSED")`; 1 is closed, 0 or unset is open.
- Produces: Governor `proposalCount()`, `proposalDetailsAt(uint256)`, from OZ `GovernorStorage`.

- [ ] **Step 1: Write failing tests:** DAO `set` stores and emits; deployer, timelock and governance each revert `Unauthorized`; unset returns zero; zero-address constructor reverts; after `propose`, `proposalCount` is 1 and `proposalDetailsAt(0)` returns the same targets and calldatas.
- [ ] **Step 2: Run** `npx hardhat test test/core/AppConfig.test.js test/plugins/GovernancePlugin.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** `AppConfig` with the `onlyDAO` pattern at `contracts/core/Treasury.sol:28`, under 30 lines. Add `GovernorStorage` to `GovernancePlugin` with required `_propose` override.
- [ ] **Step 4: Run** tests, plus check deployed size under 24,576 bytes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(contracts): add DAO-owned AppConfig and on-chain proposal storage`.

## Task 2: Deploy core, allocation, lifecycle tests

**Files:**
- Modify: `scripts/lib/deploy-core.cjs`, `scripts/deploy.cjs`, `scripts/smoke-governance.cjs`, `scripts/deploy.config.cjs`, `test/integration/DAOFlow.test.js`
- Create: `scripts/distribute-test-tokens.cjs`

**Interfaces:**
- Consumes: Task 1.
- Produces: `core.contracts.appConfig`; `deployments/<network>.json` with `contracts`, `deployBlock` (captured before `deployCore`), `gitSha`, `chainId`, `params`, `codeHashes`, `guardian`.

- [ ] **Step 1: Write failing integration tests:** `executed proposal closes voting` asserts `get` is 0 before and 1 after, through `dao.execute`; `defeated proposal cannot execute` with A For and B Against at the planned allocation; `guardian cancels queued proposal`, passing `guardian` to `deployCore`, state `Canceled`, execute reverts.
- [ ] **Step 2: Run and confirm failure.**
- [ ] **Step 3: Implement.** Add `AppConfig` to `deployCore`. Add `verifyCore` checks: `appConfig.dao()`, guardian holds CANCELLER when set, deployer has no MINTER. Set `votingPeriod: 3600`, add a `rskTestnetRehearsal` config with short periods.
- [ ] **Step 4: Implement distribution script.** Transfer the allocation, then assert deployer balance 0, `delegates(deployer)` zero, `proposalCount()` 0 at finish.
- [ ] **Step 5: Run** `npm run test:contracts` and `npx hardhat run scripts/deploy.cjs --network hardhat`. Expected: pass.
- [ ] **Step 6: Commit.**

## Task 3: Testnet canary, rehearsal, deploy

**Files:**
- Create: `contracts/test/EvmCanary.sol`, `deployments/rskTestnet.json` (generated), `docs/l2-dao-poc-2026-11-05/EVIDENCE.md`
- Modify: `.github/workflows/deploy-rsk-testnet.yml` (add distribution step)

- [ ] **Step 1: Sam creates** `rsk-testnet` environment, `UTP_TESTNET_DEPLOY_ENABLED=true`, new testnet-only `DEPLOYER_PRIVATE_KEY`, nonzero `GUARDIAN_ADDRESS`. Fund deployer, A, B, guardian with at least 0.002 tRBTC each; check Hardhat gas estimate first; record faucet txs.
- [ ] **Step 2: Canary.** Deploy `EvmCanary`, which runs MCOPY, PUSH0, TSTORE/TLOAD and asserts results. On failure stop, recompile with `evmVersion: shanghai` or `paris`, and rerun all contract tests.
- [ ] **Step 3: Rehearse** a full lifecycle with short parameters on a separate manifest, using a real wallet from the UI once Task 5 exists. Mandatory: a live bug costs 25 hours otherwise.
- [ ] **Step 4: Deploy accepted parameters** by workflow, distribute, commit manifest by hand from the run artifact.
- [ ] **Step 5: Read back** with `rootstock-testnet.drpc.org`. Expected: `SMOKE OK`, chain 31, code hashes match. Record the provider. Ledger notes this is partly independent.

## Task 4: On-chain config reader and gate

**Files:**
- Create: `src/lib/chain/deployment.ts`, `src/lib/chain/abi.ts`, `src/lib/chain/appConfig.ts`, `src/lib/chain/appConfig.test.ts`, `src/app/api/app-config/route.ts`
- Delete: `src/lib/contracts.ts` (no importers)
- Modify: `src/app/api/vote/route.ts`, `src/app/page.tsx`, `src/components/issue/VotePanel.tsx`, `src/components/Providers.tsx` (drop `rootstock` mainnet)

**Interfaces:**
- Produces: `readAppConfig(): Promise<{ civicVotingClosed: boolean; block: bigint }>`, which throws on failure so no default is cached. `DEPLOYMENT` from committed manifest. `ABIS` via `parseAbi`; do not import `src/lib/generated`.
- Produces: `GET /api/app-config` returning `{ civicVotingClosed: boolean | null, source: "chain" | "unavailable" }`, revalidating at 30 s.

- [ ] **Step 1: Write failing tests:** value 1 is closed; 0 is open; wrong chain ID throws; 2000 ms timeout throws; route maps a throw to `source: "unavailable"` with no-store. For `/api/vote` with `DAO_CONFIG_GATE=1`: closed returns 403 `voting_closed`; unavailable returns 503 `chain_unavailable`; gate unset never calls the chain.
- [ ] **Step 2: Run** `npx vitest run src/lib/chain src/app/api/vote`. Expected: FAIL.
- [ ] **Step 3: Implement.** Gate is the first statement in `POST`, ahead of `IP_SALT` and auth.
- [ ] **Step 4: Show state** in client components via fetch: `DataStatusBadge` status live or unavailable, text "Set by DAO proposal", link to `/governance`. Add the spec's banner when `DAO_CONFIG_GATE=1`.
- [ ] **Step 5: Run** `npm run ci:fast`, then commit.

## Task 5: Governance page

**Files:**
- Create: `src/lib/chain/proposals.ts`, `src/lib/chain/proposals.test.ts`, `src/app/api/governance/proposals/route.ts`, `src/components/governance/ProposalList.tsx`, `src/components/governance/ProposalActions.tsx`, `src/components/governance/ProposalActions.test.tsx`
- Modify: `src/app/governance/page.tsx`

**Interfaces:**
- Consumes: `DEPLOYMENT`, `ABIS`.
- Produces: `listProposals(): Promise<ProposalView[]>`, `ProposalView = { id: string; label: string | null; state: ProposalState; forVotes: string; againstVotes: string; abstainVotes: string; eta: string | null; targets; values; calldatas; descriptionHash }`. `label` null means not from the template.

- [ ] **Step 1: Write failing tests:** walks `proposalCount`/`proposalDetailsAt`; maps all eight states; decodes the template calldata to "Close civic voting" or "Open civic voting"; other calldata yields null label; bigint becomes string.
- [ ] **Step 2: Write failing component tests:** no wallet shows connect prompt; wrong chain disables actions and offers switch; zero votes shows delegate prompt; each state shows only its valid action.
- [ ] **Step 3: Implement.** Render `TopBar`. Connect with Privy `login({ loginMethods: ['wallet'] })`. Actions: delegate, propose, castVote, queue, execute. Propose offers one template, building `dao.execute([AppConfig],[0],[set(CIVIC_VOTING_CLOSED, value)])` with a description including a nonce. Free-form calldata is out of scope.
- [ ] **Step 4: Run** `npm run ci:fast` and `npm run build`, then commit.
- [ ] **Step 5: Sam confirms** Privy app ID and adds preview origin in the Privy dashboard.

## Task 6: Testnet lifecycle run

**Files:** Modify `docs/l2-dao-poc-2026-11-05/EVIDENCE.md`, `docs/testnet-readiness-2026-10-31/EVIDENCE.json`.

Wait on `state()`, never on elapsed time.

- [ ] **Step 1: Deploy a preview** with `DAO_CONFIG_GATE=1`, after Sam's OK. Record that it shows open and `get` reads 0.
- [ ] **Step 2: A and B delegate.** A proposes closing voting at least one block later. Both vote. Queue, wait, execute. Record each tx.
- [ ] **Step 3: Verify effect.** `ConfigSet` tx, `get` is 1 from second RPC, preview shows closed, `POST /api/vote` returns 403.
- [ ] **Step 4: Verify negatives.** `eth_call` of deployer `set` reverts. Run a proposal to defeat (A For, B Against). Guardian cancels another once queued; state `Canceled`, execute reverts.
- [ ] **Step 5: Reopen** by a further proposal; confirm open.
- [ ] **Step 6: Independent review** of ledger against the chain. Record `ROOTSTOCK_DAO_TESTNET_ACCEPTED`, including the trust sentence. Save a Brain handoff.

## Timeline

Estimates, not commitments. Close then reopen is at least ~50 hours of chain time; any live bug adds ~25.

| Dates | Milestone | Depends on |
|---|---|---|
| Nov 5-6 | Task 0 Step 1: pushed, PR green | Sam's push OK |
| Nov 6-9 | Canary on testnet (Task 3 Step 2), early go/no-go | Testnet key, funds |
| Nov 9-11 | Tasks 1-2 | Pushed branch |
| Nov 11-16 | Tasks 4-5 | Task 2 manifest shape |
| Nov 16-18 | Rehearsal, accepted deploy | Guardian, Privy origin |
| Nov 18-24 | Task 6 | Wallet B holder |
| Nov 25 | Acceptance review, choose next track | Task 6 |
| Parallel | Migrations, secrets, Vercel, merge | Sam's decisions |

After acceptance, in order: nationwide civic coverage (C1-C3), tiered identity (I2), Citrea comparison, then L2/PQ gates G1-G6. Those stay unscheduled until measurements exist, as the L2/PQ spec requires.
