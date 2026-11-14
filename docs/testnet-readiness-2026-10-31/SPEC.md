# UTP testnet acceptance specification

Status: proposed acceptance contract, for Sam's validation. Date: 2026-10-31.
Evidence and findings: CLAIM-AUDIT.md. Execution handoff: IMPLEMENTATION-PROMPT.md.

User-directed identity expansion (2026-10-31): phone, authenticator and camera validation in tiers, local wallet-held data, and an AI-first everything-app direction. `IDENTITY-AND-APP-RESEARCH.md` defines the proposed tier policy, component research, local-data boundary and additional identity acceptance gates. Those gates are prerequisites for identity/eligibility claims under B and D; the tiers themselves remain a proposed mapping, not implemented assurance.

Preferred implementation path (2026-10-31): `AUTH-CUSTODY-BITCOIN-STACK.md` maps existing Supabase Auth, Privy/Web3, third-party custodian APIs and narrowly scoped Bitcoin commitments into five testable slices. It does not assert that a custodian API or Bitcoin anchoring completes the custom L2.

## Objective

Deliver nationwide civic participation and citizen legislative requests, conventional DAO governance on Rootstock testnet as an intermediate milestone, and eventually a custom Bitcoin L2 with private voting, verifiable execution, and explicitly scoped post-quantum protection. Do not substitute the intermediate milestone for the full goal.

## Baseline and constraints

Local master is dirty; PR21 is stacked on PR20. Historical CI proves 175 contracts passed, but zero frontend tests ran. Remote smoke is read-only. Quantum integration, ZK ballots, custom L2 and live testnet lifecycle remain unverified/unimplemented. See the claim audit for exact evidence.

Preserve unrelated work. No production money or real BTC deposits. Mainnet, provider/environment changes, migrations, deployment, external messages and pushes/merges require their applicable authorization. Secrets remain in approved stores. No new skill/plugin/MCP without required scanning. Dell-only CI. No autonomous self-approval of gates.

## Success levels

All criteria below are proposed tests, not statements that they have passed. Missing evidence is NOT_RUN or BLOCKED, never PASS. Acceptance attaches to an exact commit, config and deployed address set.

### A — Local integrated baseline

- Reconcile the stacked PR candidate and local auth work in an isolated checkout; record provenance of every imported change.
- Run compile, lint, typecheck, build, contract tests and nonempty frontend/API suites. Define `ci:fast` if required by fleet rules; do not assume it exists.
- Test DB migrations on disposable local data: empty database and upgrade path, RLS ownership, duplicate IDs, concurrent vote updates and aggregate consistency.
- Reproduce the historical suite before interpreting new failures; retain all meaningful prior assertions, not merely a passing-test count.
- Cover wrong network, missing configuration, rejected signatures, session expiry and wallet disconnect in browser tests.

### B — Civic workflow acceptance

- Federal and all 50 states have explicit source-adapter status, freshness, failed-record queue and documented gaps. For testnet acceptance, validate representative records per enabled jurisdiction against official source text; label any incomplete jurisdiction and do not call national ingestion complete until each passes.
- Local scope is a versioned registry defining included government-body types and geographic denominator. Each locality is verified, stale, blocked or not integrated. A pilot subset may pass a scoped pilot only; full nationwide local success requires the agreed registry's entire denominator to pass. Inventory must precede a completeness/date promise.
- Ingestion is idempotent; versions/amendments are preserved; source outages show stale/unavailable, not sample legislation. Topic and ballot bind a specific version hash and voting window.
- Citizen flow: authenticate -> draft -> edit -> moderate -> publish -> endorse -> export. Unauthorized edits fail; official/citizen provenance stays distinct. Sending to officials is a separate authorized action.
- Vote tests: replay, concurrent requests, double voting, withdrawal/change policy, invalid choices, cross-jurisdiction collisions, missing/forged auth, RLS bypass attempts and independent aggregate recomputation.
- AI summaries carry citations that support their claims; unverifiable claims fail closed or display unverified. Test citation mismatches and injected instructions in source documents.
- Public sentiment, eligible-person polling and binding token governance remain separate. No verified-residency/one-person claim without a selected and tested eligibility system.

### C — Live Rootstock DAO testnet acceptance (intermediate success)

1. CI evidence from the exact candidate on an authorized Dell runner, including genuine frontend tests. Resolve current zero-runner finding before scheduling jobs.
2. Approved release manifest: git SHA; compiler/settings/lockfile hashes; chain ID 31; ABI/artifact hashes; expected immutable constructor values; contract addresses; deployment and wiring transaction hashes; block hashes; intended roles; allocation; verification depth policy.
3. Read back chain ID, bytecode and wiring through independent RPC sources. Check token, Governor, timelock, registry, DAO and treasury against the manifest. Reconstruct all relevant roles/permissions from deployment events and query effective state. Compare at a recorded block; detect reorg/replacement.
4. Distribute/delegate test tokens to independently controlled participants under a documented allocation. Three participants is a proposed minimum functional scenario, not a decentralization guarantee.
5. Through the actual UI on chain31: create a cited proposal, exercise For/Against/Abstain across scenarios, wait actual voting deadline, queue, reject execution before timelock, execute after delay, and verify recipient balance/state change and events from a second RPC. No `evm_mine`/time travel on public testnet.
6. Negative scenarios: insufficient threshold, insufficient quorum, defeated/cancelled proposal, repeat vote, repeat execution, replay/wrong-chain signature, unauthorized DAO call, stale frontend/indexer state. Verify optional guardian cancellation and lack of escalation if a guardian is configured.
7. Assert intended post-operation permissions and token distribution. Record that ROOT governance can change permissions; review grants rather than declaring permanent exclusivity.
8. Test RPC outage, browser refresh/reconnect, indexer restart/backfill, duplicate events and simulated reorg reconciliation locally; conduct non-disruptive public-testnet outage tests through isolated clients.
9. Proposed seven-day observation window after last material fix; daily and event-driven health evidence, no unresolved critical/high findings. This is an acceptance policy proposal, not proof that seven days establishes security.
10. Publish a reproducible acceptance report containing receipts and failures. Conventional DAO testnet completion must say PQ/ZK/custom-L2 completion remains outstanding.

Configured public-testnet window is 2880 blocks plus 3600 seconds timelock and voting delay. Actual chain progress determines duration. Do not compress it silently to claim a quick end-to-end pass. Short devnet tests are a separate evidence class.

### D — Full requested custom-L2 testnet success

Requires B's agreed coverage, C's governance behavior adapted to the custom chain, and all of:

- Approved architecture identifying execution, sequencing/consensus, DA, Bitcoin anchoring vs settlement, verifier/dispute mechanism, bridge, withdrawal rights, fees and emergency/upgrade authority. An anchor alone is not Bitcoin validation of execution.
- A functioning custom network with independently operated validating components; reproducible genesis and configuration; state recovery from public availability data; no hidden central administrator described as decentralized.
- Execution proof verifies valid transitions and rejects modified transactions, roots, witness/proof, wrong chain/domain and replay. Document all cryptographic wrappers and trust/setup assumptions.
- Private voting proves eligibility and one vote per election with unlinkable ballot data and a publicly verifiable tally. Test duplicate nullifiers, stale membership, key compromise/recovery, issuer abuse, small anonymity sets and metadata leakage. State explicitly whether receipt-freeness/coercion resistance is provided; do not imply it from ZK alone.
- Real standardized PQ implementation with known-answer and malformed-input tests; voter/key binding, revocation and recovery; no classical-only downgrade across accounts, token movement, operator/admin keys, custody or bridges within the claimed boundary. Any classical Bitcoin dependency remains disclosed; do not claim full end-to-end PQ security while it remains.
- Bitcoin test-network integration: deposits, valid exits, invalid exits, double withdrawal, operator/challenger outage, censorship, reorg and DA withholding exercises, with bounded behavior and actual receipts. No mainnet funds.
- DAO demonstrably changes an allowed protocol parameter or upgrade through a timelock; rejected/unauthorized proposals cannot alter protocol state. Treasury governance alone does not prove network governance.
- Workload-specific benchmark report: hardware, batch size, proof-generation time, verification time, cost, throughput, p50/p95/p99 acknowledgement and settlement delays, failure rate, and recovery. Pick SLOs after measurement and user validation. Earlier 100 TPS/2-second figures are not committed targets.
- Independent specialist cryptographic/bridge review plus resolved findings. Automated self-review cannot substitute for this. If the selected architecture cannot meet the required threat model, report infeasibility and propose options; never weaken the claim silently.

Full goal status is the conjunction of required gates. Rootstock C passing does not satisfy D.

## Dependency-driven schedule

First cycle: baseline reconciliation -> regression tests for R1–R6 -> Dell CI eligibility -> local civic/DAO vertical slices -> deploy-ready packet. Remote action waits for its authorization while unrelated local work continues.

Next: approved public testnet deployment -> actual voting/queue/execution window -> observation -> acceptance report. In parallel, read-only L2 research and credential-free benchmarks may proceed within authorization.

Only after measured baseline effort, jurisdiction inventory, selected L2 architecture, staffing and audit availability should dates be estimated. No fixed 14-week or 9–15-month promise remains.

## Evidence record

For every acceptance ID record: status PASS/FAIL/NOT_RUN/BLOCKED, SHA/config hash, timestamp, command/tool, environment, expected/actual behavior, exit status, sanitized log/artifact path, transaction/block IDs where applicable, limitations and reviewer. Never store secrets or private ballots in evidence.

## Unresolved decisions

- Definition/denominator of nationwide local coverage (municipalities, counties, special districts and other bodies).
- Civic identity/eligibility and privacy requirements; token voting is a separate DAO mechanism.
- L2 architecture and achievable quantum protection boundary, including Bitcoin custody.
- Tester allocation, independent participants/operators/reviewer, budget and hardware.
- Deployment/environment/runner authorizations and observation/SLO policy.

These block their dependent steps only; baseline testing and safe preparation can continue after the caller validates this specification.
