# Phase 1: Stablecoin Collateral & Tokenomics Foundation

## 1. Goal
Evaluate, test, and finalize the foundational infrastructure for the UBTC stablecoin, ensuring it is ready for BTC-backed collateralization on RSK.

## 2. Approach
Upon codebase mapping, the core components of Phase 1 have already been implemented:
- `contracts/tokens/UBTC.sol`
- `contracts/plugins/StablecoinController.sol`
- Next.js dashboard at `src/app/stablecoin/page.tsx`
- Deployment configurations in `scripts/deploy.cjs` and `hardhat.config.cjs`

The goal of this phase is simply to verify that they are functioning correctly and RSK configs are fully valid, performing any minor technical debt cleanup before moving to Phase 2.

## 3. Tasks

### 1-1. Audit Stability & Safety
- **Details:** Review `StablecoinController.sol` against the security checklists. Check for CEI patterns, reentrancy guards, and oracle staleness checks.
- **Verification:** Run `npx hardhat test test/plugins/StablecoinController.test.js`.

### 1-2. Verify React & Next.js Hooks Integration
- **Details:** Ensure that `useStablecoinPosition` and related Wagmi hooks in `src/lib/hooks.ts` are using the proper ABIs and match the `StablecoinController.sol` signatures.

### 1-3. Hardhat Hardening & RSK Deployment Ready
- **Details:** Sanity check `hardhat.config.cjs` for mainnet and testnet properties (`chainId: 31` and `30`). Ensure `deploy.cjs` covers all parameters correctly.

## 4. Verification
1. Run Hardhat test suite over `StablecoinController`.
2. Lint the contracts using standard checks.
3. Once completed, Phase 1 will be marked done and we will transition to Phase 2.
