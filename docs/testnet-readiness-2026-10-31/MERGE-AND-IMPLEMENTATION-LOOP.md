# UTP branch integration and implementation loop

Status: release integration completed 2026-10-31. This remains an implementation plan, not a claim of civic or custom-L2 testnet readiness.

## Verification snapshot (2026-10-31)

- PR #21 head `e70fd24`: fresh isolated `npm ci`, `npm run test:contracts` (175 passing), `npm run lint`, `npm run typecheck`, and `npm run build` exited 0. Build emitted optional Privy module and dynamic-dependency warnings. Fresh `npm run test:web` exited 0 with **zero tests** on the PR head.
- PR #20 head `5a10ca1`: fresh isolated `npm ci`, lint, typecheck and build exited 0. `npx hardhat test` exited 14 with 14 failing contract cases, including the absent `MockPriceOracle` artifact. Therefore #20 alone is not a releasable `master` candidate.
- PR #21 was updated from `e70fd24` to `6c570a4` with a dedicated `[self-hosted, linux, utp]` CI label, a disabled-by-default testnet workflow, deploy-key exposure limited to its deploy step, a nonempty Vitest suite and `ci:fast`. Fresh local `ci:fast` passed: 2 web utility tests and 175 contract tests. GitHub Dell run `41263088334` passed both jobs and Vercel preview was ready. PR #21 then merged into PR #20 as squash commit `0eb25eb`.
- A trailing-space fix on the combined PR #20 branch was `06116ee`. Its fresh local `ci:fast` passed (2 web utility tests, 175 contracts), `git diff --check` was clean, exact-head Dell run `41263936615` passed both jobs, and Vercel preview was ready. PR #20 merged to protected `master` as squash commit `777658f`. Post-merge Dell run `41264740648` completed successfully on exact master SHA `777658f`. A manual Vercel production deploy from a clean detached `777658f` worktree completed as `dpl_b2mSdYBpPc48gJGtTzxPjgeMryS9`.
- UTP runner `dell-utp-1` was registered on Dell under dedicated `utp-runner` OS identity, using GitHub runner v2.338.2 with the official release SHA-256 verified. GitHub reported it online and it completed the PR and post-merge checks. `master` branch protection now requires the named web and contract checks, strict up-to-date validation, PR merge, linear history, conversation resolution, and admin enforcement; force-push and deletion are disabled. UTP's GitHub environments are Preview and Production only; `rsk-testnet` does not exist and the testnet deployment switch remains off.
- The two added web tests exercise news deduplication, not the full voting or API user path. Those remain open coverage gates.

## Current authority and release boundary

- Canonical dirty checkout: `/Users/maysamtehranchi/Code/utp`, local `master` at `d81e60b`, two local commits ahead and one merge commit behind `origin/master` at `777658f`. Preserve its uncommitted OAuth/Supabase work and all other modifications.
- PR [#21](https://github.com/samtheloanman/utp/pull/21) merged into PR [#20](https://github.com/samtheloanman/utp/pull/20), and the combined PR #20 merged to `master` as `777658f`. This avoided releasing the 14-failure intermediate PR #20 baseline.
- Vercel Git integration built merge commit `777658f` as a ready **preview**. After post-merge Dell CI passed, the same clean source commit was manually deployed to production as `dpl_b2mSdYBpPc48gJGtTzxPjgeMryS9`. Vercel inspect reports READY and maps `utp-beta.vercel.app`, `unitingthepeople.org`, and `www.unitingthepeople.org` to that deployment. Public beta-alias smoke: `/`, `/how-it-works`, and `/governance` returned 200; `/launch` and `/vault` returned 307 to `/`. Direct HTTP verification of the custom domain from the Mac was blocked by Cloudflare 1010; alias mapping was verified through Vercel. Git integration production-target configuration still needs reconciliation. The prior production deployment `dpl_FMah8a3BGAkqLz4nKPLvDzqbRpQu` remains available for rollback. A source merge or web deployment is not a testnet contract deployment.
- `master` is now protected with required GitHub Actions checks on the UTP Dell runner. The PR #21 initial head had `ubuntu-latest` and no `ci:fast`; its merged finalization removed those defects. The manual testnet workflow is disabled by default; no `rsk-testnet` environment exists.

## Branch finalization

1. In isolated worktrees, audit PR #20 and PR #21 diffs for secrets, schema changes, unsafe claims, dead code, test coverage, and deployment effects. Reconcile local `master`'s two unpushed commits separately; never reset the dirty checkout.
2. Fix PR #21's CI and deployment workflows to use a **verified, authorized Dell runner**. Keep the deployment environment's secret isolated from PR jobs and dependency installation; require environment protection. If no eligible Dell runner exists, leave PR #21 unmerged and record the runner setup as a blocker. Do not switch to a GitHub-hosted runner.
3. Add real web/API tests and make `test:web` fail when zero tests are collected. Add `ci:fast` covering the meaningful local gates. Ensure contract tests include failed proposals, timelock-only execution, role revocation, PQ-key substitution, and rollback/negative paths. Do not turn on mock PQ/ZK modes outside local tests.
4. Run `npm ci`, `npm run ci:fast`, full contract tests, typecheck, lint, build, and a local governance lifecycle on the exact candidate. Record command exit codes and candidate SHA. Review PR #20 independently, then PR #21 against the post-#20 base. The old 175-test result is historical only.
5. Require exact-head Dell CI, test integrity, security review, Vercel preview smoke, no unresolved material finding, and a verified production-deployment/rollback boundary. Merge #21 into its existing #20 base first. Re-read the resulting #20 head, run Dell CI on that **combined** candidate, then merge #20 into `master` and verify the production deployment. Never release #20 alone, auto-merge a moving head, or rely on `MERGEABLE` alone.

## Orchestrated implementation loop

Each iteration selects the smallest unmet acceptance item in [SPEC.md](SPEC.md). Before edit: state owner, exact branch/base SHA, files, expected behavior, threat or failure mode, falsifiable test, affected data and services, and rollback. During edit: preserve other work, implement one vertical slice, and add a negative test where security or authorization changes. After edit: targeted tests, `ci:fast`, exact-head CI, runtime read-back, evidence ledger update, and a decision to continue, rework, or block. Stop a failing branch after three attempts without new evidence; do not weaken the gate. An orchestrator coordinates work but cannot grant deployment, provider, or credential authority.

### Workstream A — release foundation

- Resolve branch stack and Dell CI above; inventory the uncommitted Supabase OAuth work, choose one canonical civic identity, and link Privy wallets by server challenge and verified signature.
- Remove static/placeholder content labeled live, fabricated AI citations, silent sample-data fallback, and local Hardhat address from deployable UI paths. Require zero-test failure and source-aware API tests.
- Exit: exact-head CI and a production-safe release of the existing civic shell, with no claim of functional national voting.

### Workstream B — civic participation

- Build a source registry, immutable source/version identifiers, jurisdiction hierarchy, freshness and correction pipeline. Implement one local, one state, and federal vertical slice before scaling to nationwide coverage. Record coverage by jurisdiction/source in a ledger.
- Implement legislative request drafting, review, citation and jurisdiction checks, abuse controls, consent, publication states, and an explicit boundary before any message to an official. Keep civic sentiment and legally binding DAO votes distinct.
- Exit: users can authenticate, find a sourced bill, make a test suggestion/request, and cast a verified civic test vote; authorized read-back shows the right tally, correction and duplicate-vote behavior. Nationwide coverage remains open until its ledger is complete.

### Workstream C — Rootstock DAO testnet

- Harden Governor/Timelock and deployment manifest; distribute/delegate test governance tokens across independent accounts. Bind app flows to verified chain ID, contract addresses and bytecode. Add proposal/vote/queue/execute UI and event indexing.
- Deploy only with testnet-only identity/funds and recorded authorization. Verify actual wall-clock vote and timelock progression, at least two independently controlled participants, failure and cancellation cases, second-RPC read-back, and recovery. Local time travel and a read-only remote smoke do not satisfy this exit.
- Exit: `ROOTSTOCK_DAO_TESTNET_ACCEPTED` with transaction receipts and role/control inventory. This is application governance on Rootstock, not proof of a custom Bitcoin L2.

### Workstream D — custom Bitcoin L2 and privacy

- Specify trust, bridge, data availability, fraud/validity proof, finality, upgrade and reorg assumptions before selecting protocol. Benchmark candidate designs and require an independent cryptography/security review.
- Separately prove private ballots, eligible uniqueness, tally correctness, verifiable execution, Bitcoin anchoring/inclusion and reorg handling, and the actual scope of post-quantum protection. An on-chain Dilithium interface, mock verifier, wallet signature or Rootstock deployment proves none of these alone.
- Exit: `FULL_CUSTOM_L2_TESTNET_ACCEPTED` only after all [SPEC.md](SPEC.md) gates have independent evidence. Do not make real-BTC custody or quantum-safety claims from a prototype.

## Evidence packet per batch

Record base/head SHAs, dirty state, changed paths, relevant threat findings, test names and exit codes, CI run and exact head, deployment/chain IDs, transaction hashes, independent read-back, rollback result, unresolved failures, and next authorized action. Keep secrets and private ballots out of logs and Brain.

## Ordered implementation backlog

| ID | Dependency | Deliverable | Falsifiable exit test |
|---|---|---|---|
| R1 | None | Consolidate #21 into #20 and fix release checks | Combined head passes nonempty web tests, 175+ contracts, build and exact-head Dell CI; preview matches head. |
| R2 | R1 | Protect `master`, verify Vercel production target and rollback | Required checks reject an untested head; deploy the exact clean master SHA with production environment after post-merge CI, verify public alias and route smoke, and retain prior deployment for rollback. Reconcile why Git integration built `master` as Preview. **Status (2026-11-03): BLOCKED_ON_AUTH** (cause `NOT_DETERMINED`; see R2 finding below). |
| I1 | R1 | Canonical Supabase civic account and linked wallet | Wrong account, replayed challenge and mismatched signature cannot link a wallet; session refresh persists. |
| I2 | I1 | Tiered credential proofing and local encrypted wallet | Phone/TOTP/camera signals remain separate; lost-device and recovery tests do not silently lower assurance. Synthetic credentials only. |
| C1 | R1 | Source registry and one federal/state/local ingestion slice | Each record has source URL, jurisdiction, version and fetch time; bad key/provider failure never yields a fixture marked live. |
| C2 | I1,C1 | Proposal/request draft and civic vote | Unauthorized write fails; duplicate/concurrent votes have one authoritative tally; no message to officials occurs in tests. |
| C3 | C1,C2 | Nationwide coverage expansion | Per-jurisdiction ledger identifies provider, recency, gaps and correction path; no unverified locale is marked covered. |
| G1 | R1 | Governance manifest, roles and app UI | Contract bytecode/chain mismatch blocks actions; token allocation and all role holders are disclosed. |
| G2 | G1 | Rootstock testnet lifecycle | Independently controlled actors complete proposal, vote, queue, wait and execute; failed/cancelled cases and second-RPC read-back pass. |
| L1 | G2 | Bitcoin L2 threat model and benchmark | Architecture review specifies sequencer, DA, proof, bridge, reorg, exit and custody assumptions with measured alternatives. |
| L2 | L1,I2 | Private-vote and verifiable-execution prototype | Ballot/eligibility privacy, uniqueness and invalid proof rejection are independently tested; no mock verifier qualifies. |
| L3 | L1,L2 | Full custom L2 testnet | Independent review and testnet receipts pass all full-scope [SPEC.md](SPEC.md) gates, including Bitcoin anchoring and reorg handling. |

Parallelism: I1 and C1 may proceed after R1; C3 and G1 may proceed after their own prerequisites. One integration owner maintains the acceptance ledger and refuses cross-workstream claims of completion until a vertical user path is tested. Every external mutation remains separately gated by the current fleet rules.

### R2 finding (2026-11-03)

Status: `BLOCKED_ON_AUTH`. Cause of the Preview build of `master` 777658f: `NOT_DETERMINED`.

Checked (read-only, Vercel MCP):
- `list_teams` and `get_git_deployment_context` returned no teams for the connected identity.
- `list_projects` (search `utp`) found project `utp` = `prj_PT3ORkBHyeUhSBU3z5s3qILiRCik`, account `team_D2rNpq3e1jGfA7HanfuwMX3O` (scope `samtheloanmans-projects`).
- `get_project`, `list_deployments`, `list_project_domains` and `get_deployment` (`dpl_b2mSdYBpPc48gJGtTzxPjgeMryS9`, `withGitRepoInfo`) all failed `403 forbidden`: the connection is not authorized for scope `samtheloanmans-projects`.

Not read, so not known: `link.productionBranch`, the Git-connected repo, `target` for the 777658f deployment and for `dpl_b2mSdYBpPc48gJGtTzxPjgeMryS9` / `dpl_FMah8a3BGAkqLz4nKPLvDzqbRpQu`, and `meta.githubCommitRef`/`githubCommitSha`. Hypotheses to test once readable (unverified): production branch is not `master`; the Git link points at a different repo or branch; an ignored-build or custom-environment setting applies.

Needed from Sam (authorization, not done here): approve Vercel team access for scope `samtheloanmans-projects` for this connection (`authorize_team_access`), or supply the project Settings > Git "Production Branch" value and the three deployments' target/branch/SHA. No Vercel setting was changed. Any change to the production branch setting stays gated on Sam's explicit approval.
