# UTP debate and live fact-check roadmap

Date: 2026-11-21. Status: PROPOSED, a planning context for later phases. It does not change the current Phase 2 scope.

Vision: UTP hosts structured debates on any topic between the leading experts in that field, plus AI debates. Claims are fact-checked live, citizens rate the fact-checks, and audience sentiment is measured before and after each debate.

## Where we are (origin/master @ 266b6fd)

- Merged on 11-21: #24, #25 (Chain 31 governance deploy recorded) and #26 (Phase 2 hardening). No PRs are open.
- Phase 2 is still open:
  - explorer verification;
  - UTP distribution and delegation;
  - real `/governance` and `/token` UIs (both are placeholders today);
  - runbook;
  - closed alpha;
  - W3 governance UI and W5 alpha E2E.
- `.gsd/STATE.md` and the ROADMAP box "Run the deploy" are out of date.
- Debate today:
  - `src/app/api/debate/route.ts` returns a static pro/con digest (`sourced|sample|offline`). No LLM is called and nothing is live.
  - The UI is `AiDebate` in `src/app/issue/[id]/page.tsx`.
  - There are no debate tables.
- Fact-check today: nothing is built. `src/app/news/page.tsx:9` advertises fact-checking with no code behind it. Either remove that copy or ship D1.
- Known P1 bug: Legistar `MatterTitle` is written into `summary_official`. The debate route then labels it `sourced` with confidence 1. See `docs/superpowers/plans/2026-11-19-utp-data-schema-audit.md`.

## Feature timeline

| Phase | Target | Feature | Type |
|---|---|---|---|
| D0 | Dec 2026 | Fix the P1 `summary_official` bug. Make the news copy honest. Add a `claims`/`citations` schema. | Fix |
| D1 | Q1 2027 | **AI debate v1.** Two personas (for and against) argue one bill or issue. Every claim must cite a bill text, Congress.gov or a retrieved source. Uncited claims are dropped. | AI, async |
| D2 | Q1 2027 | **Async fact-check layer.** Claim extraction, then a check-worthiness gate, then a ClaimReview lookup (Google Fact Check Tools), then web retrieval (Serper or Perplexity Sonar), then a grounded verdict. Verdicts are TRUE / MOSTLY TRUE / MISLEADING / FALSE / UNVERIFIABLE. Each verdict is published as ClaimReview JSON-LD. | AI, async |
| D3 | Q2 2027 | **Argument map and audience votes.** A Kialo-style pro/con tree. Open to Debate's before/after vote, reusing shadow votes. Polis-style consensus clusters. | Civic |
| D4 | Q2 2027 | **Community rating.** Port the Apache-2.0 Community Notes bridging scorer. A verdict is shown as "consensus" only after raters who usually disagree both rate it helpful. Rater reputation is tied to DAO identity. | Civic + DAO |
| D5 | Q3 2027 | **Expert debate, recorded.** Expert onboarding and verification (credentials, conflicts disclosed). A scheduled format with a moderator and timed rounds. Fact-checks run on the transcript after the debate. | Human |
| D6 | Q3–Q4 2027 | **Live expert debate with live fact-check.** LiveKit room, then server-side speech-to-text with diarization (Deepgram or faster-whisper), then flushes on speaker change, then a fast verdict card, then a grounded verdict that replaces it in place. Cards reach viewers through Supabase Realtime. Before each event, a Full Fact-style claim library is built per topic and per expert. Fallacy flags are shown next to verdicts. | Human, live |
| D7 | 2028 | **Mixed debates.** An expert and an AI debate each other. Citizens submit questions, ranked by bridging score. A DAO-governed fact-check dispute: stake, challenge, timelock ruling (the Factland-style model). | Human + AI + DAO |

What gates each phase:
- D1–D2 come after the DAO POC acceptance. The 11-10 spec defers free-form LLM chat until then.
- D4 needs mainnet-ready identity, or testnet identity with a disclosure.
- D6 needs the D2 pipeline accuracy benchmark to pass, plus a legal review of live verdicts made about named people.

## Build vs borrow

- **intruth-factcheck** (rpanigrahi222). Chrome extension: Deepgram, then Haiku fast verdict, then Serper, then Sonnet grounded verdict.
  - The license bans commercial use. **Do not copy its code.** Re-implement the ideas: two-tier verdicts, flush on speaker change, date-filtered sources, the check-worthy definition.
  - Optional: ask the author for permission or a partnership.
- **Google Fact Check Tools API.** Free with a key. Check it first, before any LLM call.
- **ClaimBuster.** Free academic key. Use it as the check-worthiness gate.
- **Perplexity Sonar.** Search plus cited answer in one call. Candidate to replace Serper + LLM.
- **Factiverse.** Commercial live fact-check API, with a paper on debates (arXiv 2408.07448). Benchmark it against our own pipeline.
- **Community Notes scorer.** Apache-2.0, can be ported.
- **Polis.** AGPL. Self-host it as a separate service, or re-implement it.
- **MBFC Data API.** Paid. Source bias tags.
- **Factland DAO.** Likely what "DAOC fact checking" refers to. Crowdsourced fact-check protocol on ICP. No public API, so contact them directly. Its dispute model fits D7.
- OSS references: LiveBrief, the-record, real_time_fallacy_detection. Check each license before using.

## Constraints

- Only cited claims reach users. A missing source shows as UNVERIFIABLE, never as a guess.
- Every live verdict is labeled "AI draft" until it is grounded or rated by the community.
- Experts' consent and their disclosed conflicts are stored with each debate.
- No borrower or fleet data goes into any of these pipelines.
