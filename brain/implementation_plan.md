# UtP Foundation Implementation Plan

This plan covers the initialization of the **United the People** platform, focusing on the "Information & Polling" MVP (V1).

## User Review Required
> [!IMPORTANT]
> **Regulatory Disclosure**: V1 includes voting for the Iran portal. This carries heightened OFAC compliance risks. We will implement strict "Information only" disclaimers and non-binding shadow polling to mitigate risk.

## Proposed Changes

### [Phase 1: Project Skeleton]
#### [NEW] [NEXT.JS APP](file:///Users/johnnytehranchi/code13/utp/)
Setting up a Next.js (App Router) project with Tailwind CSS and Supabase integration.

#### [NEW] [Database Schema](file:///Users/johnnytehranchi/code13/utp/supabase/migrations/20260121_init.sql)
Implementing the normalized schema defined in `prd.md` (Bills, Actions, SourceRegistry, Votes).

### [Phase 2: Data Ingestion]
#### [NEW] [Congress.gov Connector](file:///Users/johnnytehranchi/code13/utp/lib/connectors/congress.ts)
A robust, idempotent connector using the primary government API.

### [Phase 3: AI & Participation]
#### [NEW] [LLM Summarizer](file:///Users/johnnytehranchi/code13/utp/lib/ai/summarizer.ts)
Grounded summarization using system prompts that require citations and link back to source text.

---

## Verification Plan

### Automated Tests
- `npm run test:ingestion`: Verifies Congress.gov connector fetches and normalizes correctly.
- `npm run test:qa`: Validates summaries for citations and neutrality.
- `npm run test:api`: Tests the public read-only API endpoints.

### Manual Verification
- Verify the Activity Stream shows recent House/Senate bills.
- Cast a shadow vote via a test account and confirm aggregate updates.
- Check the Iran portal for safety disclaimers and voting availability.
