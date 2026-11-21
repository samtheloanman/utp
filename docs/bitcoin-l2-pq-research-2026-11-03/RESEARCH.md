# Bitcoin L2 and post-quantum architecture research

Reviewed 2026-11-03 (America/Los_Angeles). Scope: autoresearch deep; source inspection and primary-source research, no implementation, benchmark, deployment or cryptographic certification. See [SPEC.md](SPEC.md) for the proposed implementation contract and [UPSTREAM-PINS.json](UPSTREAM-PINS.json) for repository revisions and README hashes. Pins are research snapshots, not approved dependency versions.

## Recommendation

Build UTP in three independently testable layers:

1. Keep the existing Next.js/React/Supabase application and Solidity/OpenZeppelin DAO on Rootstock testnet. Establish working civic and governance flows before changing consensus.
2. Build a small, deterministic Rust verification service and local credential wallet. Add FIPS 204 ML-DSA authorization with persistent key binding, replay protection and recovery that preserves assurance. Evaluate native STARK execution proofs with no pairing-based wrapper. Anchor batch commitments to Bitcoin for auditability.
3. Research a Bitcoin-enforced dispute/exit adapter using BitVM3 or BitVMX only after the proof, data availability and failure-recovery model works. This is the candidate custom L2 track, not an existing capability.

This is a proposed engineering choice, not evidence that a complete quantum-resistant Bitcoin L2 is available off the shelf. The hardest unresolved parts are Bitcoin custody/exit security and confidential, verifiable tallying under a quantum threat. More hash power does not repair either of those problems.

## Verified UTP baseline

GitHub `master` resolved to `777658f5d1a5c40bd4f765aa6174abc7d3ebfbd2` during this review. Code below was read with `git show origin/master:<path>`, not assumed from the dirty checkout. The canonical checkout remains local `d81e60b`, ahead two and behind one, with uncommitted OAuth/Supabase and other work. No reset or reconciliation was performed.

| Existing component | Actual behavior | Reuse / gap |
|---|---|---|
| `contracts/plugins/GovernancePlugin.sol` | OpenZeppelin token-weighted Governor and timelock integration; optional hybrid signature verification | Reuse DAO mechanics. Caller supplies the PQ key each vote; there is no voter-to-key registry in this contract. A valid signature from an attacker's own PQ key would not establish the voter's PQ identity after classical-key compromise. Source finding, not an exploit run. |
| `contracts/crypto/dilithium/ZKNOX_ethdilithium.sol` | Interface labeled as a dummy compilation fix | Not a cryptographic implementation; matching its ABI is not FIPS conformance. |
| `contracts/crypto/IZKVerifier.sol` | Placeholder verifier interface | No ballot circuit, production verifier, or proof security parameters established. |
| `test/plugins/GovernancePlugin.test.js` | Hybrid tests use `MockQuantumVerifier` and digest-shaped signatures | Tests control flow, not ML-DSA correctness or quantum security. |
| `scripts/lib/deploy-core.cjs` | Hybrid mode defaults off, verifier defaults to zero | Preserve defaults until real verification and full authority-path tests pass. |
| `contracts/core/UTPPolling.sol` | Public address-to-vote mapping and public vote events | Public polling; cannot satisfy confidential-ballot acceptance. |
| `src/app/api/vote/route.ts` | Authenticated Supabase upsert containing user ID, vote and IP hash | Account-linked civic voting; not anonymous or cryptographically tallied. Aggregate trigger is assumed by a comment, not proved by this route. |
| `package.json` | Next 15 / React 19, Supabase JS, Privy/Wagmi/Viem, Hardhat 2, OpenZeppelin 5, Vitest | Keep application stack. No demonstrated integrated Rust proof/Bitcoin dispute pipeline in inspected tree. |

The prior release record reports 175 contract tests and two web utility tests. Those are historical results, not rerun by this research. This review does not refresh production, DB, runner or contract-runtime state.

## What Bitcoin security can actually provide

**Lightning:** Bitcoin scripts enforce channel funds and dispute transactions; nodes monitor the chain and react within deadlines. It is a strong payment architecture, but does not supply general DAO execution, credential eligibility or private tallying. Use an existing implementation if payments become necessary. [BOLT 3](https://github.com/lightning/bolts/blob/master/03-transactions.md), [BOLT 5](https://github.com/lightning/bolts/blob/master/05-onchain.md).

**Merged mining:** participating pools commit to a Rootstock header in a Bitcoin coinbase mining job and submit a proof to Rootstock. A result can satisfy Rootstock difficulty without satisfying Bitcoin difficulty. Bitcoin nodes do not thereby execute Solidity or validate Rootstock state. A new UTP chain would need pool participation and its own consensus/incentive design; deploying on Rootstock reuses that existing network. No current hashrate percentage is assumed here. [Rootstock mechanism](https://dev.rootstock.io/concepts/foundations/merged-mining/).

**Anchoring:** a confirmed commitment gives an auditable ordering/time boundary under Bitcoin's reorg assumptions. It does not guarantee valid execution, available data or withdrawal rights. UTP verifiers must reject an invalid batch even if its hash is in Bitcoin.

**Bitcoin-enforced disputes:** a valid challenge path can constrain BTC release under the chosen protocol's assumptions. Inspect signers, setup, data access, challenger deadlines, capital and censorship independently. A verifier running only on a UTP server cannot enforce Bitcoin withdrawals.

## Candidate comparison

| Candidate | Useful capability | Critical boundary | Decision |
|---|---|---|---|
| Rootstock + existing Governor | EVM DAO, existing UTP compatibility, merged mining | PowPeg custody and EVM authorization have additional assumptions; no automatic PQ migration | First functional DAO testnet. [PowPeg](https://rootstock.io/powpeg/) |
| Stacks Nakamoto | Bitcoin-linked history ordering and its smart-contract ecosystem | Bitcoin finality is not blanket proof of bridge, signer or application security; new execution stack for UTP | Comparative reference, no rewrite justified. [Mechanism](https://docs.stacks.co/learn/block-production/bitcoin-finality) |
| Starknet / SN Stack | STARK ecosystem, native account abstraction, reusable appchain infrastructure | Roadmap still distinguishes Bitcoin bridge work from full Bitcoin settlement; account PQ upgrades do not upgrade Ethereum/Bitcoin custody or all state hashes | Strong research reference and Stwo candidate, not a drop-in Bitcoin-settled UTP chain. [Roadmap](https://www.starknet.io/roadmap/), [quantum migration hub](https://quantum.starkware.co/) |
| Citrea / Clementine | Concrete Bitcoin-rollup/bridge design and circuits | Whitepaper requires honest participants in several roles and ledger liveness; published circuit docs use Groth16 | Classical-security comparator, not selected for PQ settlement. [Bridge](https://github.com/chainwayxyz/clementine/tree/b61efacf56b4196cda0023419e01d4b0d6f2bc5d), [paper](https://citrea.xyz/clementine_whitepaper.pdf), [circuit](https://github.com/chainwayxyz/citrea/blob/nightly/docs/batch-proof-circuit.md) |
| BitVM2 | Existing optimistic Bitcoin verification implementation | Official repository warns against production use; Groth16/BN254 path is not PQ | Reproduce as a classical baseline only. [Code](https://github.com/BitVM/BitVM/tree/c620dbfaacebdf778e765a6681985350389973b1) |
| BitVM3 | Newer garbled-circuit bridge research, revised October 2026 | Honest setup, honest signers/challengers, capitalized operator and secure signatures remain assumptions; paper costs are not UTP measurements | Highest-priority bridge research comparison; no production adoption yet. [Paper](https://eprint.iacr.org/2026/933) |
| BitVMX | Disputable RISC-V computation; potential route to checking our verifier | CPU component says unaudited/not production-ready; a CPU emulator is not a complete bridge | Prototype challenger route after proof interface is stable. [Code](https://github.com/FairgateLabs/BitVMX-CPU/tree/93b0468da1d8c00e559924552cf8c178ba4fdd92) |

A BitVMX program that verifies a STARK is an implementation hypothesis, not an established compatible, economical deployment. Compile limits, execution traces, transaction graph, Bitcoin standardness and dispute costs must all be measured. BitVM3's paper-reported improvements cannot be converted into a promised UTP fee or throughput.

## Proof-engine choice

**RISC Zero native STARK receipts are the preferred execution baseline to evaluate first:** Rust guest programs make the state machine easier to reuse and review. The documented pipeline distinguishes composite/succinct STARK receipts, Groth16 receipts and fake receipts. Accept only pinned real proof types; bind the program image and public outputs. A Groth16 wrapper would restore elliptic-curve assumptions even if the inner proof is a STARK. [Proof system](https://dev.risczero.com/proof-system/).

This is **not yet the selected private-ballot prover**. RISC Zero's published zero-knowledge advisory remains a material research gate: the fetched advisory lists all versions and no patched version, and cautions applications that require privacy. Map that advisory to the chosen release with maintainer evidence before admitting secret ballots. Public execution experiments can proceed separately. [Advisory](https://github.com/risc0/risc0/security/advisories/GHSA-5xgj-pmjj-gw49).

**Stwo is the performance/research challenger.** Its pinned README describes production use in SHARP, but leaves application parameters and downstream verifier integrity to integrators and does not link audit reports in its audit section. Its README also says proving is not constant-time. Earlier branch/cached views returned an older work-in-progress notice; the commit-pinned document governs this snapshot. Production use elsewhere does not prove our custom ballot constraints or witness confidentiality. [Code](https://github.com/starkware-libs/stwo/tree/826591c6c371376810ca8213b5812d5daf6d5092), [Circle STARK paper](https://eprint.iacr.org/2024/278).

**Plonky3 is a lower-level alternative**, with more application construction and security-review burden. Its example explicitly does not provide zero knowledge. Do not turn a benchmark example into a private-voting product. A search index suggested a privacy issue at #2362, but the opened issue had a different subject; that search claim was excluded. [Code](https://github.com/Plonky3/Plonky3/tree/0d803737b681774186cd283b1fd2d8e493655c82).

STARK is a family of constructions. Post-quantum soundness requires checking the complete transcript, hashes, commitments, recursion, security parameters and any wrapper. Neither “STARK” nor “256-bit hash” alone establishes a particular quantum security level. [Foundational paper](https://eprint.iacr.org/2018/046).

## Post-quantum stack

| Purpose | Proposed choice | Adoption condition |
|---|---|---|
| Signing governed actions / issuer credentials | ML-DSA-65 under FIPS 204 as the initial benchmark profile | Standard test vectors, independent interoperability, domain-separated encoding and security review; this is a proposed parameter choice, not benchmark-proven optimality. [FIPS 204](https://csrc.nist.gov/pubs/fips/204/final) |
| Alternative recovery/offline signing | Evaluate SLH-DSA only if its hash-based assumptions justify size/latency costs | No bespoke threshold scheme; benchmark and review separately. [FIPS 205](https://csrc.nist.gov/pubs/fips/205/final) |
| Recipient key establishment for encrypted backup | ML-KEM-768 in a reviewed hybrid encryption construction | ML-KEM is a KEM, not a signature or direct ballot encryption protocol. Audit composition, authentication, nonce management and recovery. [FIPS 203](https://csrc.nist.gov/pubs/fips/203/final) |
| Native signature implementation | Evaluate `mldsa-native`, behind a narrow versioned interface | Check exact license files, target-specific timing assumptions and pinned release. Maintainer testing/formal checks are not a UTP audit. [Implementation](https://github.com/pq-code-package/mldsa-native/tree/335703f2f11d5dcb417413c3a573a5fbeb3fbfdc) |
| Browser interoperability prototype | `@noble/post-quantum` only for synthetic experiments initially | Pinned README says no independent audit and no constant-time claim. Do not equate TypeScript convenience with hardware-backed wallet custody. [Implementation](https://github.com/paulmillr/noble-post-quantum/tree/48e493397e69fa3e377bd454ff5261b1a7e22651) |

Use separate keys for credentials, action signing, encryption and recovery. For hybrid authority require classical **and** enrolled PQ authorization; an “either signature works” fallback defeats protection from classical compromise. Bind PQ enrollment before that compromise. Rotate using the current authorized key set and explicit recovery policy; email, phone or a newly supplied PQ key cannot silently replace it.

Protect the entire authority graph: token transfers/delegation, proposer keys, treasury, upgrade admin, guardian, relayer policy, issuer and recovery. Securing only `castVoteHybrid` leaves attackers able to change voting power or bypass the decision elsewhere. Even a well-protected application account leaves chain-level and Bitcoin custody assumptions outside that guarantee.

## Frontier Bitcoin quantum proposals

- **BIP 360 / P2MR:** draft in the inspected BIP revision. Removes Taproot's key-path exposure; explicitly does not solve short-exposure attacks by itself. It is not an activated PQ signature opcode. [Proposal](https://github.com/bitcoin/bips/blob/61ff3f1361838fa7eb671e650b4e614207ca9df7/bip-0360.mediawiki).
- **BIP 361:** draft migration/sunset proposal depending on a future PQ signature BIP. No activation date is assumed. [Proposal](https://github.com/bitcoin/bips/blob/61ff3f1361838fa7eb671e650b4e614207ca9df7/bip-0361.mediawiki).
- **Quantum Safe Bitcoin / QSB:** interesting existing-consensus research. The pinned repository reports nonstandard transactions, miner-direct delivery and an estimated roughly 59-bit Grover margin for its stated construction; these are author claims, not our measurements. Its README still lists broadcast as unattempted while StarkWare published a mined-transaction announcement. This discrepancy needs transaction/script and paper-version reconciliation. It is not selected for UTP custody or fast transactions. [Code](https://github.com/avihu28/Quantum-Safe-Bitcoin-Transactions/tree/b22f81c093488d09b9cd59c171c79b6c40812cf1), [research announcement](https://starkware.co/blog/quantum-safe-bitcoin-transactions-without-softforks/).

Thus the defensible near-term claim is **post-quantum application authorization under specified assumptions**, not end-to-end quantum-safe BTC custody. No forecast of a quantum computer arrival date is necessary to make the application crypto-agile now.

The QSB [August mined-transaction announcement](https://starkware.co/blog/the-first-quantum-safe-bitcoin-transaction-has-been-mined/) and [September optimization report](https://starkware.co/blog/ai-research-competition-cut-quantum-safe-bitcoin-costs-by-79-in-a-week/) are vendor reports, not independent transaction validation in this review. The optimization competition uses a synthetic grinding benchmark; its cost estimate is not a UTP custody or execution benchmark. This is worth watching, but it does not remove the need for a deployable exit protocol and independently reviewed security margins.

## Privacy and data availability

An eligibility proof must demonstrate membership in an approved jurisdiction/credential set, policy version and epoch without publishing the account, face image, phone number or credential. A stable private eligibility secret and election-scoped nullifier should prevent duplicates across device/key rotation; the exact construction needs review. A nullifier is not a personhood proof: issuer enrollment and duplicate issuance remain trust boundaries.

Semaphore is a useful reference for membership/nullifier semantics, but its public message does not hide the vote choice, and its existing cryptography is not our PQ solution. [Proof semantics](https://docs.semaphore.pse.dev/guides/proofs), [circuit](https://docs.semaphore.pse.dev/technical-reference/circuits).

For confidential choices, distinguish privacy from the public, from the prover/operator, and from colluding tally authorities. Server-side proving of plaintext ballots exposes them to that server. PQ-encrypting each ballot does not create homomorphic aggregation or verifiable threshold decryption. Selecting a reviewed confidential tally protocol is a blocking architecture decision. Until resolved, use synthetic ballots and label any anonymous-public-choice demonstration accordingly.

The public availability bundle should include encrypted/committed ballots, proofs, roots, nullifiers and policy identifiers—not raw credentials. Replicated off-chain availability remains an additional assumption even when a root is on Bitcoin. An unavailable batch must remain unresolved; an independent verifier needs enough data to reconstruct/check state without the original operator. Resistance to coercion, vote buying and malicious phones is a distinct research scope, not a consequence of ZK.

## Implementation ordering

The [spec](SPEC.md) defines dependency gates rather than invented delivery dates or TPS claims. First establish bound PQ keys and real-vector tests; then compare execution proof engines on the same public synthetic workload; then prove Bitcoin inclusion and reorg behavior; then address confidential tallying; finally exercise a complete bridge/dispute and DAO-controlled upgrade path. Optimize only after a correctness baseline and recorded measurements exist.

This document's selections are engineering recommendations. External sources establish their own described mechanisms and limitations; they do not establish UTP implementation success.
