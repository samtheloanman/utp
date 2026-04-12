# Areas of Concern

This document identifies potential technical debt, fragile areas, and security concerns within the `utp` codebase.

## Technical Debt & Tooling
- **Hybrid Package Constraints**: Storing Hardhat and Next.js entirely inside the same root `/` triggers occasional TS conflicts between Frontend environment DOM references and Hardhat Node references. Splitting `tsconfig.json` paths or transitioning to a Monorepo strategy (e.g. Turborepo) could resolve this long-term.
- **Gas Hardcoding**: Hardhat's network configuration has fixed gas limits/prices that may fail during high network congestion on RSK.

## Security Considerations
- **Environment Management**: The system relies on production API keys and private keys loaded into `.env` logic that are not tracked in `dotenv.example` perfectly.
- **Smart Contract Audits**: As the application builds an extensible Plugin structure (`PluginRegistry.sol`), the registry inherently becomes an attack vector if restricted access controls are bypassed. A robust audit of `PermissionManager.sol` is required.
- **Client-side Data Validation**: Ensuring that the Supabase client logic implements proper Row Level Security (RLS) is essential as direct database operations from Next.js clients might inadvertently bypass frontend state rules.

## Performance Concerns
- **Smart Contract Size limitations**: Incorporating multiple inherited features into a single Core contract could push against EIP-170 limits natively. Although RSK gas limits vary, adopting Proxy based architecture might be required later to avoid max-bytecode issues. Currently `viaIR` is enabled in Hardhat which is mitigating size limits at the expense of compilation speeds.
