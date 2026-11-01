# Phase 2: AI Debate Fact-Generation Engine

## Goal
Build the off-chain AI debate generation engine that powers the "Genius Debates" feature.

## Tasks
- [ ] Setup `src/app/api/debate/route.ts` to connect to Anthropic/OpenAI APIs.
- [ ] Create system prompts for historical personas (Einstein, Socrates, Adam Smith, etc.).
- [ ] Implement a multi-agent orchestration logic where agents respond to the issue claim and to each other.
- [ ] Integrate Supabase to cache the debate outputs (to avoid redundant API costs).
- [ ] Update frontend UI to consume the new structured debate format instead of generic arguments.
