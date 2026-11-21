# UTP Bitcoin L2 / post-quantum research packet

Reviewed 2026-11-03. Autoresearch deep, research complete; implementation spec proposed.

- [SPEC.md](SPEC.md): architecture, interfaces, work packages, attack cases, test commands and acceptance labels.
- [RESEARCH.md](RESEARCH.md): current-code findings, primary sources, technology comparison and recommendation rationale.
- [UPSTREAM-PINS.json](UPSTREAM-PINS.json): 11 upstream repository snapshots, license metadata and README hashes where obtainable. These are not selected production dependencies.

Recommendation: reuse the UTP application and Rootstock DAO; implement bound post-quantum authority and deterministic execution first; evaluate native STARK proofs; add Bitcoin checkpoints; advance to private tallying and Bitcoin-enforced disputes only when their separate gates pass.

Verified here: remote master SHA, affected source paths, current primary documentation and repository metadata, local artifact links. Not run here: runtime tests, cryptographic interoperability, benchmarks, actual Bitcoin inclusion/exit experiments, deployments or specialist cryptographic review.

The October release and broader civic acceptance documents remain in [the existing readiness folder](../testnet-readiness-2026-10-31/MERGE-AND-IMPLEMENTATION-LOOP.md). This packet refines the L2/PQ research track without replacing those objectives.
