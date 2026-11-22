# Project State

Last updated: 2026-11-22

## References
- Roadmap: `.gsd/ROADMAP.md` (only live roadmap)
- Product: `brain/prd.md`, `brain/02_TECHNICAL_SPEC.md`; MVP PRD `docs/superpowers/specs/2026-11-17-utp-mvp-prd.md`
- Brand: `DESIGN.md`.

## Baseline
`master` is at `266b6fd`. Merged since `777658f`: #23 (testnet alpha: auth, DAO reader, local legislation), #24 (RSK testnet prep, security headers), #25 (chain 31 deployment manifest), #26 (OAuth form and env hardening). #22 closed as superseded. CI runs on the self-hosted Dell runner `dell-utp-1`; it does not run `test:db` or Playwright.

## Live, with evidence (read 2026-11-22)
- Supabase project `tuajgdhslxqmiaehsend`: 11 migrations, last `20261119000200`. 567 bills, 353 bill versions, 0 ingest failures. Last successful source fetch 2026-11-22 09:00 UTC, so the daily ingest cron runs in production.
- Rootstock testnet (chain 31), deployed 2026-11-21, block 8318791, manifest `deployments/rskTestnet.json`: governor `0x0437E78E9217DA39C4e8c1a36fDCE45A746a948F`, token `0x112E2AFb65Dfa84Dfd975eE25B5AE0a7c3bcb9a7`, timelock `0x4D9c8a46D579F7C85Fa90ad133ce806B87be7AD8`, AppConfig `0x099809F6a0859c0A8707337440169F88AF306a46`. Voting period 90 blocks, quorum 4%, timelock delay 3600 s.
- Wallet-link HMAC key row exists in `private.wallet_link_settings`.
- 2 auth users exist.

## Built and merged
- Sign-in (Supabase, Google button), `requireUser` on write APIs.
- 33 Legistar places; `/bills` with place filter, `/bill/[id]` with sentiment vote and own-vote display.
- Ingest: source marked live only after bills and versions are stored; failures logged; titles kept in `bills.source_title`, never in `summary_official`.
- Proposals tied to bills (`voting_proposals.bill_id`); proposal form prefilled from a bill page.
- Wallet link (signature plus server HMAC), chain id from `NEXT_PUBLIC_CHAIN_ID`.
- Testnet distribution supports a third voter (250k / 200k / 50k).

## Not proven
- No vote, proposal or wallet link has been made by a real user: 0 rows in `shadow_votes`, `voting_proposals`, `wallet_links`.
- No on-chain proposal has gone through vote, queue and execute on chain 31.
- A civic proposal does not yet create or point to an on-chain proposal.
- The 6 signed-in Playwright specs have not run against a real account.
- Production pages were not fetched in this check.

## Next actions
1. Signed-in pass on production: sign in, vote on a bill, propose from a bill, link a wallet; confirm the rows.
2. On-chain rehearsal with 3 wallets on chain 31: delegate, propose, vote, queue, execute.
3. Link a civic proposal to its on-chain proposal id.
4. Home page still shows sample issues; real bills are only at `/bills`.
5. Add `test:db` and Playwright to CI.
