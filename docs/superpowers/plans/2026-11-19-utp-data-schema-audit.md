# UTP data and schema audit — 2026-11-19

Scope: read-only review of Claude's `claude/utp-w2-legistar` at `6ae6a8f`, GitHub PR #23, eight applied migrations in Supabase project `tuajgdhslxqmiaehsend`, and live aggregate readbacks. This audit does not change Claude's code or apply a migration. Live counts are a point-in-time snapshot, not acceptance of a deployed app.

## Data map

| Domain | Tables | Primary path / relationship | Current evidence |
| --- | --- | --- | --- |
| Source identity and coverage | `jurisdictions`, `data_sources`, legacy `api_sources` | OCD ID on jurisdiction; source slug and jurisdiction FK | 33 jurisdictions and 33 sources, all sources marked `live`; only Legistar clients ingested |
| Legislation | `bills`, `bill_actions`, `bill_versions`, `ingest_failures` | `(source_id, external_id)` unique bill identity; actions and versions by `bill_id`; failures by source | 330 bills; 0 versions, 0 failures; 1 missing introduction date; 0 source/jurisdiction mismatches |
| Sentiment | `shadow_votes`, `vote_aggregates`, `tracked_bills` | Auth user + bill; vote aggregate trigger; per-user tracking | All currently 0 rows; RLS restricts vote reads to owner |
| Older polls | `polls`, `poll_options`, `poll_votes` | Poll → option → authenticated vote | 0 votes; legacy parallel model retained |
| Community requests | `voting_proposals`, `civic_proposals`, `civic_proposal_options`, `civic_proposal_votes` | `/api/propose` currently writes `voting_proposals`; canonical proposal model is separate | Both proposal tables currently 0 rows; no verified migration path between models |
| Chain governance | `chain_networks`, `dao_proposals`, `dao_votes` | Chain ID + proposal ID and voter address; reader can use indexed DAO rows | 0 indexed proposals; on-chain lifecycle not live-accepted |
| Identity | `user_profiles`, `wallet_link_challenges`, `wallet_links` | `auth.users` FKs; chain registry; nonce and signed link | 0 wallet links; no live user acceptance |

All 23 public tables have RLS enabled. This verifies RLS switches, not the correctness of every grant and policy. The migration history contains exactly eight versions through `20261110000000`. GitHub PR #23 required web and contract checks passed at the observed head; check the exact head again before merge.

## Ranked findings and fixes

1. **P1 — False sourced summary.** `ingest.ts` writes a multiline Legistar `MatterTitle` into `bills.summary_official` (line 98). `/api/debate` reads that field and returns `status: sourced`, `confidence: 1` (lines 74–89). A title can contain agenda text but is not an official summary. Fix: retain the full title in a provenance-specific field or leave `summary_official` null until an official synopsis is fetched. Add a test for a multiline title and debate status. Existing live rows with this value need an evidence-preserving correction plan before any migration/update.
2. **P1 — Source success is recorded before bill persistence.** `ingest.ts` sets `adapter_status: live` and `last_successful_fetch` before the `bills.upsert` call (lines 71–105). A database failure leaves the source marked successful even when no new bills were stored. Fix with one transaction or move success write after bill commit; test a forced bill-upsert failure. The UI must distinguish source fetch success from ingest success.
3. **P1 — Version and failure tables disconnected.** Every `CivicBill` has `recordHash`, and the live `bill_versions` table has `(bill_id, record_hash)` uniqueness, but ingestion never writes a version. All 330 live bills have zero version rows. Failed fetches update an existing source only; failures for an unregistered source create no row, and `ingest_failures` remains empty. Add a stable-source registration step, version upsert, and a failure event; verify repeat ingest creates no duplicate version.
4. **P2 — Coverage label overclaims.** `/coverage` is a static list of 33 probed clients; it does not read `data_sources.adapter_status` or age. It cannot display the planned nationwide `live / partial / none` census. Join registry status/freshness and show unintegrated targets explicitly. Do not equate a 200 API probe with coverage of that jurisdiction's complete legislative corpus.
5. **P2 — Ingest load and completeness.** `/api/ingest` fans out all 33 places with `Promise.all`, pulls only the latest ten matters, and runs under a 60-second limit. This can amplify source load and miss older records. Add bounded concurrency, cursor/backfill, per-source rate limits, and count/lag receipts. The current 330 rows are exactly ten per place; that is a sample window, not complete coverage.
6. **P2 — Proposal data models diverge.** `/api/propose` writes `voting_proposals`; the newer `civic_proposals` model and `dao_proposals` index have no verified link to that write. Choose one user-facing request aggregate, define explicit promotion to DAO with evidence hash, and test the FK/ID handoff end to end. Avoid deleting legacy rows until reconciliation is proven.
7. **P2 — Source timestamps and hashes.** `bills.updated_at` is currently stamped with fetch time, and `recordHash` omits title/content. Separate source modification time, fetch time, and normalized-content hash. Test a title change with unchanged status/date; tests currently check only status changes.
8. **P3 — Empty/error presentation.** `listStoredBills` returns `[]` on read failure, so `/bills` says no bills were stored. Show an unavailable state distinct from a legitimately empty table; retain sanitized error code in logs.

## Acceptance criteria for the next owned slice

- A recorded Legistar row with multiline title never becomes an official summary or `confidence: 1` debate response without an official synopsis source.
- Inject a bill-upsert failure: source must not advance successful-ingest timestamp/status; failure remains visible.
- First ingest writes bill + version. Re-ingest same hash writes zero new versions; changed title/content writes one new version. Public bill UUID and existing votes remain stable.
- Coverage renders actual source state and freshness, including unintegrated target jurisdictions.
- Check the live DB readback after a staging run: rows, version counts, source lag, failures, and mismatch counts. Preserve existing live data and run migrations only with the already applicable provider authorization.

## Ownership and next action

Claude owns the active W2 branch and its files. Codex did not edit that worktree. The smallest next code action is a failing test for the multiline-title → false-sourced-debate path, followed by the minimal correction in Claude's claimed W2 worktree. Review this audit against the latest head before implementation.
