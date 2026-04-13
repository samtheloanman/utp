# Project Roadmap

## Milestone 1: MVP - AI Debates & L2 Stablecoin Ecosystem

### Phase 1: Stablecoin Collateral & Tokenomics Foundation
- Implement `UBTC.sol` and stablecoin controller logic.
- Integrate with RSK to handle BTC-backed collaterals securely.
- Basic Next.js dashboard for users to mint/wrap and view stablecoin balances.

### Phase 2: AI Debate Fact-Generation Engine
- Build the off-chain AI debate generation engine (using LLM integration/Supabase functions).
- Source facts, process news/legislative agendas, and output distinct "Pro" vs "Con" arguments.
- Expose the debate arguments via API endpoints to the Next.js frontend.

### Phase 3: Interactive Polling & Legislature UI
- Develop the "Legislature" UI in Next.js showcasing the AI-generated debates.
- Create on-chain/off-chain polling logic allowing users to cast votes based on the debates.
- Capture, aggregate, and visualize user sentiment metrics.

### Phase 4: Mainnet/Public Testnet Integration & E2E Validation
- Connect the frontend polling and token dashboards sequentially to the deployed RSK smart contracts.
- E2E testing using Wagmi for transactions and AI outputs validation.

---
*Last updated: 2026-04-13*
