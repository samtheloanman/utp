# UTP claim audit and red-team review

Review date: 2026-10-31 America/Los_Angeles. Scope: material claims in this chat's project review and proposed roadmap, remote candidate source, CI records, and relevant official documentation. This is a source/document review, not a penetration test, independent audit, or fresh execution of the test suite.

## Verdict

Proceed with bounded civic and conventional DAO testnet preparation. Do not describe the current candidate as quantum-secure, private voting, a new Bitcoin L2, or end-to-end testnet proven. The previous calendar and performance figures are unvalidated estimates and are withdrawn as delivery commitments.

Strongest version of the plan: deliver useful civic workflows while validating conventional governance and researching the substantially different security requirements of a custom Bitcoin L2.

Load-bearing assumptions: (1) coverage can be expanded through reusable data adapters, (2) existing DAO contracts are a useful application baseline, (3) a viable Bitcoin settlement and post-quantum security design can be selected. Only parts of (1) and (2) have supporting implementation evidence; (3) remains research.

## Evidence map

Remote source below is pinned to `e70fd24cc7ee69cda77528199fe5688183256cdb` (PR21). PR20 head is `5a10ca177c19470921a8c5a3159a9c585b8f3167`. Both were OPEN when checked. PR21 targets PR20's branch, not master.

- E1: https://github.com/samtheloanman/utp/pull/20
- E2: https://github.com/samtheloanman/utp/pull/21
- E3: https://github.com/samtheloanman/utp/actions/runs/39207584829 — retrieved logs: contract job `175 passing (6s)`; frontend job `No test files found, exiting with code 0`.
- E4: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/scripts/smoke-governance.cjs
- E5: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/scripts/lib/deploy-core.cjs
- E6: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/contracts/plugins/GovernancePlugin.sol
- E7: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/test/plugins/GovernancePlugin.test.js
- E8: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/.github/workflows/deploy-rsk-testnet.yml
- E9: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/scripts/deploy.config.cjs
- E10: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/scripts/deploy.cjs
- E11: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/.gsd/STATE.md
- E12: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/package.json
- E13: https://github.com/samtheloanman/utp/blob/e70fd24cc7ee69cda77528199fe5688183256cdb/contracts/crypto/dilithium/ZKNOX_ethdilithium.sol
- E14: GitHub API `GET repos/samtheloanman/utp/actions/runners` returned `total_count:0,runners:[]` during this review. Dell host health and organization-runner access were not separately inspected.
- E15: Local `/Users/maysamtehranchi/Code/utp` source: `src/app/api/legislature/route.ts`, `src/app/api/propose/route.ts`, `src/app/api/vote/route.ts`, `supabase/migration.sql`. Local state is dirty and is not equivalent to PR21.

## Claim ledger

| Claim | Finding / correction | Evidence |
|---|---|---|
| 175 passing contracts | Verified historical CI result on the named head; not rerun here; not proof of absence of vulnerabilities | E3 |
| Frontend CI is green | Technically green but zero frontend tests ran; cannot support functional readiness | E3, E12 |
| Governance uses OZ Governor/Timelock | Verified source imports, inheritance, wiring; an upstream audit does not audit this integration | E5, E6 |
| Full testnet governance lifecycle works | Unsupported. Full lifecycle uses local mining/time travel; remote smoke returns after read-only checks | E4 |
| Testnet is not deployed | Branch documentation says so; listed Actions history contains only CI. No authoritative live deployment inventory or address/RPC validation obtained, so actual external deployment status is UNKNOWN | E11; run list |
| 11 invariants prove permissions safe | There are 11 named checks; they check selected actors, not a complete role/permission inventory | E5 |
| 8.9M gas and successful RPC rehearsal | Reported in branch state; not independently reproduced in this review. Do not use as a gas budget | E11 |
| Quantum verifier exists | Named Dilithium file is an interface; optional-mode tests use a mock. Real cryptographic integration is unverified | E7, E13 |
| Hybrid voting resists classical-key compromise | Unsupported: caller supplies PQ public key without a voter/key registration binding | E6 |
| Private ZK voting exists | Not established. Current civic vote route records user ID with vote; Governor records address-linked votes | E6, E15 |
| Deployer has no control after setup | Administrative roles are revoked, but initial 10M token supply is assigned to deployer by default; governance influence remains | E5, E9 |
| 4% quorum, 10K threshold, 2880 blocks, 3600-second timelock | Verified candidate config values, not a security endorsement or live-chain configuration | E9 |
| 2880 blocks is a day | Only approximate; vote ends by actual contract clock, not a promised wall-clock deadline | E9 |
| 0.01 tRBTC is enough to deploy | Merely a configured minimum balance, not a dynamic gas-price/estimate check | E9, E10 |
| Dell CI can run immediately | Not established; runner API returns none; both candidate CI and deploy workflow use ubuntu-latest contrary to current fleet policy | E8, E14; CI source |
| Existing APIs fully support civic participation | Prototype source exists; legislature falls back to hardcoded records; propose route has no explicit auth check; exploitability depends on DB policies not inspected live | E15 |
| Federal/state/local source options exist | Verified documentation below; live ingestion coverage, credentials, licensing, quotas and freshness are unverified | S1–S3 |
| Nationwide local coverage by a fixed date | Unsupported. No complete jurisdiction/source inventory or operating estimate | Scope gap |
| 14 weeks / 9–15 months | Planning guesses, not validated staffing, effort or critical-path estimates | Withdrawn as commitments |
| 100 TPS / p95 under 2 seconds | Proposed benchmark hypotheses only; no implementation, hardware definition or measurements | Withdrawn as achieved/promised performance |
| Rootstock app equals our own L2 | False equivalence. Rootstock has its own merged-mining/security system | S4 |
| ZK means zero trust / quantum safety | False generalization; security depends on full construction, setup, signatures, bridge, DA and operational assumptions | S5–S7 |

## Red-team findings and required counter-tests

### R1 — High: optional PQ key substitution

`_castVote` decodes a public key from transaction parameters and verifies a signature over the voter-bound digest. It never verifies that this public key is the voter's enrolled key. Under the claimed classical-key-compromise threat model, an attacker controlling the classical account can generate a fresh PQ key and sign the same digest. Binding the address into a message does not bind key ownership. This is source-supported reasoning, not an executed exploit. Current remote deployment refuses hybrid mode, limiting immediate exposure.

Required: real verifier known-answer tests, reject unregistered/attacker-generated keys, pre-compromise enrollment commitment, rotation/recovery rules that do not fall back to classical-key-only authority. Apply the threat model to token transfers/delegation too: protecting only a ballot path does not secure voting power or custody. Keep hybrid claims disabled until this passes.

### R2 — High: successful smoke is not successful governance

Remote smoke neither casts a vote nor waits an actual voting window/timelock. It prints network/config values without fully attesting expected chain, immutable token/verifier wiring, compiler artifacts, roles or bytecode.

Required: exact chain assertion, manifest and bytecode verification accounting for immutable/link references; independent RPC readback; live lifecycle with independently controlled wallets and real chain time; negative lifecycle cases.

### R3 — High: CI gives misleading application confidence

`--passWithNoTests` allows zero frontend tests. Candidate workflows use hosted runners; no UTP repository runners are listed. Deploy key is job-wide, including dependency install/test steps, increasing credential exposure scope. This is exposure potential, not evidence of compromise.

Required: nonempty frontend/API/DB suites; Dell runner access validated; untrusted PR jobs never share deployment credentials or persistent privileged runner state; isolate test/install from credential-bearing deployment, inject credentials only for the required step.

### R4 — High: role renunciation is not decentralization

Deployer initially owns all 10M UTP, versus configured quorum 400K and threshold 10K. The token holder can retain effective governance control after admin renunciation. A single-actor lifecycle demonstrates functionality, not distributed governance.

Required: disclose allocation; independent tester control; test snapshot/transfer/delegation effects, minority veto/griefing, quorum shortfall, abstention, cancellation, and all DAO/timelock role holders. Do not describe locally generated wallets owned by one operator as independent governance.

### R5 — High: governance root power can change the security model

Timelock holds DAO ROOT. Authorized governance may grant future permissions, so 'only timelock executes' is a current-state assertion, not an immutable invariant. Inventory grant/revoke events from deployment and assert roles at the accepted block. Test malicious permission-grant proposals and make their effects clear in the UI.

### R6 — High: civic trust and privacy can fail outside contracts

Hardcoded fallback bills can be mistaken for live data. Local proposals lack an explicit route-level auth check; RLS effectiveness is not established. Stored user-linked ballots are not anonymous. Amendments, changing district boundaries, public IP logs and small voter sets can invalidate claims of accuracy/eligibility/privacy.

Required: no silent fixtures in live modes; stable jurisdiction/session/type identifiers; cited version hashes; concurrent-vote/aggregate tests; RLS cross-user tests; clear sentiment vs binding modes; an eligibility and privacy threat model including issuer, recovery, logs and coercion limitations.

### R7 — High: custom L2 security is a separate unresolved system

The repository does not establish a working custom sequencer, DA, proof pipeline, Bitcoin verification/bridge, withdrawal mechanism or PQ-safe custody path. STARK execution proofs alone do not imply ballot confidentiality or a quantum-resistant Bitcoin bridge. BitVM's documented assumptions and any pairing-based wrapper must be evaluated end-to-end.

Required: architecture decision, explicit trust/upgrade/custody model, valid and invalid proof tests, DA withholding, sequencer outage/censorship, reorg, bridge double-withdrawal and exit tests. No proprietary cryptography invented as an implementation shortcut.

## Official research sources

- S1 https://api.congress.gov/ and https://github.com/LibraryOfCongress/api.congress.gov — federal API exists; this audit did not run authenticated ingestion.
- S2 https://docs.openstates.org/ — provider documents 50 states, DC and Puerto Rico; this does not establish UTP coverage or completeness.
- S3 https://webapi.legistar.com/Help — client-specific legislative API exists; no nationwide municipal completeness claim follows.
- S4 https://dev.rootstock.io/concepts/foundations/merged-mining/ and https://dev.rootstock.io/dev-tools/wallets/metamask/ — separate Rootstock validation; testnet chain ID 31.
- S5 https://csrc.nist.gov/pubs/fips/204/final — ML-DSA signature standard, including current errata notice. Standardized algorithm is not proof of correct integration.
- S6 https://bitvm.org/bitvm2 — setup and operator assumptions; not assumption-free settlement.
- S7 https://www.starknet.io/roadmap/ — Bitcoin settlement/quantum items appear in a vendor roadmap; not evidence those capabilities are deployed in UTP or a drop-in solution.

## Verification limits

No fresh compile/test run, live DB/RLS audit, browser workflow, independent security review, contract deployment, chain address verification, latency/load benchmark or provider mutation occurred. Source conclusions and historical logs are explicitly separated from runtime proof. No complete-project security certification is implied.
