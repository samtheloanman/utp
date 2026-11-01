# Project State

Last updated: 2026-10-18 PT

## References
- Roadmap: `.gsd/ROADMAP.md` (only live roadmap)
- Product: `brain/prd.md`, `brain/02_TECHNICAL_SPEC.md`
- Brand: `DESIGN.md` (civic glass-teal). Dark uBTC system archived in `archive/design-dark-v1/`.

## Branch
Work branches off `master` (default). `sync/freedom-stack-master` is fully merged and can be deleted.

## Current phase
Phase 2: RSK testnet deployment (Phases 0 and 1 done 2026-10-18).

## Verified (2026-10-18, branch feat/phase0-1-governance)
- lint, typecheck, next build, hardhat compile: PASS
- `npm test`: 175 contract tests passing, 0 failing (was 128/14); no frontend unit tests yet
- Deploy rehearsal: in-process + local node over RPC, 11/11 invariants, ~8.9M gas total
- Smoke lifecycle on local node: propose → vote → queue → timelock → execute OK; 0 reverts
- Failure paths: mainnet refused; smoke refuses without a deployment record
- RSK testnet: NOT deployed. The sandbox cannot reach RSK RPC; deploy runs from the GitHub Actions workflow with the owner's secret.
- Frontend: real UI on `/`, `/issue/[id]`, `/how-it-works`, `/us/california/[bill]`; `/governance`, `/token`, `/stablecoin`, `/events`, `/news`, `/legislature` are placeholders

## Decisions
- D1: v1 = standard wallet voting; PQ hybrid optional/off; ZK deferred.
- D2: testnet params in `scripts/deploy.config.cjs`.

## Next action
1. Owner: create the `rsk-testnet` GitHub environment with `DEPLOYER_PRIVATE_KEY` (testnet-only key, funded from the RSK faucet), then run "Deploy governance to RSK testnet".
2. Build `/governance` + `/token` UI against `deployments/rskTestnet.json`.
