# Plan Review & Improvements

## 🔍 Current State Analysis

### ✅ What's Good
1. **Clear V1 Scope**: Focus on US Federal + AI summaries + shadow voting
2. **Explicit Gates**: V1→V2→V3 progression with clear criteria
3. **Regulatory Safety**: Crypto delayed to V3, Iran flagged as high-risk
4. **Agentic Ready**: AGENTS.md provides steering for Jules workflow

### ⚠️ Critical Gaps Identified

#### 1. **Missing Database Schema Specification**
- **Impact**: Can't start development without concrete schema
- **Fix Needed**: Add complete SQL schema with tables, indexes, RLS policies
- **Priority**: CRITICAL (blocks all implementation)

#### 2. **No Concrete API Budget Plan**
- **Constraint**: $100/month budget
- **Missing**: Cost per API call, rate limits, caching strategy
- **Risk**: Could blow budget in week 1
- **Fix Needed**: Add cost analysis for Congress.gov API usage

#### 3. **Incomplete Technical Stack Specification**
- **Vague**: "Next.js + Supabase" without versions or configs
- **Missing**: 
  - Which AI model? (GPT-4 vs Claude vs local Ollama)
  - Deployment target (Vercel? Railway? Fly.io?)
  - Monitoring/logging setup
- **Fix Needed**: Lock down exact tech stack with cost implications

#### 4. **No V1 Completion Tests**
- **Problem**: "Definition of Done" is subjective
- **Missing**: Automated test suite that proves V1 is shippable
- **Fix Needed**: Add Playwright E2E tests as acceptance criteria

#### 5. **Iran Portal Implementation Unclear**
- **Regulatory Risk**: OFAC compliance not specified
- **UX Risk**: What exactly is shown? What disclaimers?
- **Fix Needed**: Detailed Iran portal spec with safety UX mockups

#### 6. **No Fundraising Plan**
- **User's Success Metric**: "DAO on Bitcoin blockchain"
- **Mismatch**: V1 has zero crypto, but user wants blockchain
- **Missing**: How do we fund V2/V3 development?
- **Fix Needed**: Revenue model + fundraising deck

---

## 🎯 Recommended Improvements

### Priority 1: Add Missing Technical Specs

#### [NEW] `brain/02_TECHNICAL_SPEC.md`
Should include:
- Complete database schema (Postgres SQL)
- API cost analysis (Congress.gov @ $100/month)
- AI model selection (Ollama local vs OpenAI API)
- Deployment architecture diagram
- Monitoring/alerting setup

#### [NEW] `brain/03_COMPLETION_TESTS.md`
Should include:
- Playwright tests for critical user flows
- API integration tests for Congress.gov
- AI summarization quality tests (citation checks)
- Performance benchmarks (page load < 2s)

### Priority 2: Reconcile User's Success Metric

**User said**: "What convinces YOU to continue? **DAO on btc blockchain**"

**Current plan**: V1 has ZERO crypto (delayed to V3)

**Recommendation**:
1. Add "Future Vision" marketing section to homepage
2. Include blockchain roadmap in public docs
3. Create V1→V2 bridge: "Reputation tokens" (off-chain) that convert to governance tokens later
4. **Critical**: Set realistic timeline for blockchain (12-18 months minimum)

### Priority 3: Budget-Constrained Implementation

With **$100/month budget**, we need:
- Free tier Supabase (up to 500MB DB, 50K monthly active users)
- **Local Ollama** for AI summaries (no API costs)
- Vercel free tier for hosting (100GB bandwidth)
- Congress.gov API (free with 5,000 req/hour limit)

**Trade-off**: Local AI means lower quality summaries initially. Acceptable for V1.

### Priority 4: Iran Portal Safety First

**Must Have**:
- Prominent disclaimer: "This tool does NOT guarantee anonymity"
- No email collection for Iran users (OAuth only, preferably Google)
- No IP logging for Iran jurisdiction
- VPN/Tor usage instructions
- "Information purposes only" legal copy

**Recommendation**: Delay Iran to V1.1 (2 weeks post-launch) to de-risk V1

---

## 📊 Updated V1 Scope (Budget-Optimized)

### Core Features
- ✅ US Federal bills (Congress.gov API - FREE)
- ✅ AI summaries via **Ollama local** (FREE)
- ✅ Shadow voting (Supabase free tier - FREE)
- ✅ Email/OAuth auth (Supabase free tier - FREE)
- ✅ Public read API (Vercel Edge Functions - FREE)

### Deferred to V1.1
- 🔄 Iran portal (safety review needed)
- 🔄 Email notifications (SendGrid costs $15/month)
- 🔄 Advanced analytics

### Total V1 Cost: **$0/month** (all free tiers)

---

## 🚀 Next Actions

1. **Create `02_TECHNICAL_SPEC.md`** (database schema, architecture)
2. **Create `03_COMPLETION_TESTS.md`** (acceptance criteria)
3. **Update `prd.md`** to include "Future Vision" section for blockchain
4. **Create initial GitHub issues** for Jules to start implementation
5. **Setup local dev environment** (Next.js + Supabase + Ollama)

Would you like me to proceed with these improvements?
