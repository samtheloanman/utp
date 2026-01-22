# AGENTS.md — UtP Engineering Standards

This document steers implementation agents (Jules, Claude Code, Gemini CLI) to ensure consistent, high-quality output.

## 📁 Repository Structure
- `/apps/web`: Next.js frontend (App Router)
- `/supabase`: Migrations, RLS policies, and Edge Functions
- `/lib`: Shared logic (connectors, AI, utils)
- `/brain`: Project documentation and memory
- `/tests`: Integration and E2E tests

## 🛡️ Coding Conventions
- **TypeScript First**: Strict mode enabled. No `any`.
- **Atomic Components**: Tailwind CSS for styling. No inline styles.
- **Idempotency**: All ingestion functions must be safe to rerun.
- **Safe Failures**: AI summarization must return `null` or error code if citations are missing.

## 🏁 Definition of Done (PR Requirements)
1. **Tests**: Every new feature must include a matching test file in `/tests`.
2. **Docs**: Update relevant `/brain/*.md` files if architecture or schema changes.
3. **Citations**: AI summaries must link to primary source URLs.
4. **Compliance**: No crypto/stablecoin code allowed in V1.

## 🤖 Jules Automation Hooks
- **Trigger**: Label issues with `jules` to invoke.
- **Review**: Jules must provide a 1-paragraph summary of the "Plan" before implementation.
- **Artifacts**: Jules should include a screenshot or log excerpt in the PR description.
