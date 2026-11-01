# ARCHIVED — Planning v1 (pre-2026-10-18)

**Status: superseded. The only live roadmap is `.gsd/ROADMAP.md`; live status is `.gsd/STATE.md`.**

| Item | Why archived |
|---|---|
| `gsd-phases/01-stablecoin-foundation/*` | Stablecoin-first ordering; describes contracts/paths that no longer match (`contracts/UBTC.sol`, `CollateralManager.sol`) |
| `gsd-phases/1-stablecoin-foundation/1-VALIDATION.md` | Marked "COMPLIANT", but the StablecoinController suite fails (missing `MockPriceOracle`), and it cites `src/lib/hooks.ts` / `src/lib/__tests__/hooks.test.ts`, which don't exist. Do not trust it. |
| `gsd-phases/02-ai-debate-engine`, `03-interactive-polling-ui`, `04-mainnet-integration` | Folded into the new roadmap (Civic track, Phase 2, Phase 5) |
| `gsd-nested-dup/`, `gsd-nested-backups/`, `gsd-backups/` | Copies of copies of `.gsd/` |
| `checklist.md`, `bitcoin-dao-framework.md` | Original April "Bitcoin DAO Framework" mission plan; replaced by `brain/prd.md` + `.gsd/ROADMAP.md`. Its red-team notes (downgrade attack, plugin privilege escalation, RSK gas budget, replay protection) were carried into Phase 1. |
| `context.md` | Out of date (claims Foundry; repo uses Hardhat only) |
