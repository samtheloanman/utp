# Project State

Last updated: 2026-10-18 PT

## References
- Roadmap: `.gsd/ROADMAP.md` (only live roadmap)
- Product: `brain/prd.md`, `brain/02_TECHNICAL_SPEC.md`
- Brand: `DESIGN.md` (civic glass-teal). Dark uBTC system archived in `archive/design-dark-v1/`.

## Branch
Work branches off `master` (default). `sync/freedom-stack-master` is fully merged and can be deleted.

## Current phase
Phase 0: Green baseline.

## Verified baseline (2026-10-18, fresh clone)
- `npm ci`: OK
- `npx hardhat compile`: OK, 55 files (sandboxed environments need a local solc 0.8.24; see Phase 0)
- `npx hardhat test`: 128 passing, 14 failing; root causes identified:
  1. PluginRegistry uninstall (5): registry has no permission on the DAO to `revoke`
  2. Hybrid voting (8): MockQuantumVerifier double-hashes the message
  3. Stablecoin (1, `beforeEach`): `MockPriceOracle` contract missing
- Frontend: real UI on `/`, `/issue/[id]`, `/how-it-works`, `/us/california/[bill]`; `/governance`, `/token`, `/stablecoin`, `/events`, `/news`, `/legislature` are placeholders
- CI: none
- RSK testnet deployments: none (local Hardhat only)

## Open decisions
- D1: Quantum/ZK scope for v1 (recommended: defer to plugins)
- D2: Governance parameters for testnet

## Next action
Phase 0, task 1: fix the MockQuantumVerifier hashing mismatch (unblocks 8 tests).
