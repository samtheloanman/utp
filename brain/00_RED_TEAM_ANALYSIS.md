# United the People - Red Team Analysis

## Executive Summary
After reviewing all materials, chat logs, and research on Jules workflows, here are the **critical vulnerabilities** that could kill this project:

---

## 🚨 CRITICAL RISKS (Showstoppers)

### 1. **Scope Death Spiral**
**Problem:** Attempting to build 4 massive products simultaneously:
- Global legislative aggregation platform
- Bitcoin L2 blockchain
- Stablecoin with marketplace
- DAO governance framework

**Impact:** 99% probability of shipping nothing
**Mitigation:** Ruthless V1 scope reduction (see recommendations below)

### 2. **Regulatory Nuclear Bomb**
**Problem:** Combining Iran + Bitcoin + Stablecoin + Non-profit = multiple federal violations:
- OFAC sanctions (Iran participation)
- FinCEN money transmission (stablecoin)
- SEC securities laws (DAO tokens)
- Non-profit governance rules (profit-making activities)

**Impact:** Deplatforming, criminal liability, project shutdown
**Mitigation:** Phase blockchain to V3+ with legal counsel; V1 = ZERO crypto

### 3. **AI Hallucination Liability**
**Problem:** Presenting AI summaries as "source of truth" for legislative content
**Impact:** Misinformation lawsuits, destroyed reputation, user harm
**Mitigation:** Always show sources, confidence scores, human review for trending items

### 4. **Technical Overengineering**
**Problem:** Jules + Antigravity + Claude + Gemini + OpenCode + Ollama + Agent Zero = agent chaos
**Impact:** Coordination overhead > productivity gains
**Mitigation:** Start with 1-2 agents max; add complexity only after proving value

---

## ⚠️ HIGH RISKS (Project Killers)

### 5. **Data Licensing Time Bomb**
**APIs like LegiScan, OpenStates have TOS/attribution requirements**
- Missing attribution = cease & desist
- Need: Data Source Registry with compliance tracking

### 6. **User Safety Paradox**
**Building tools for Iran dissidents without security expertise**
- False anonymity promises = endangered users
- Need: Clear safety disclaimers, minimal data collection

### 7. **Funding Chicken-and-Egg**
**Non-profit needs donations, but V1 scope requires $250K+**
- Complex platform ≠ quick donor validation
- Need: Ultra-simple V1 that proves value in 60 seconds

---

## ✅ HARDENED STRATEGY

### **New V1 Definition** (Ship in 4 weeks)
**One sentence:** "Congress.gov but readable, with public sentiment voting"

**In Scope:**
- [ ] US Federal bills only (Congress.gov API)
- [ ] AI summaries with citations
- [ ] Anonymous shadow voting (For/Against/Unsure)
- [ ] Email updates for tracked bills
- [ ] Donation page

**Out of Scope:**
- ❌ No blockchain, no tokens, no DAO
- ❌ No state/local data
- ❌ No Iran or international
- ❌ No marketplace
- ❌ No scraping

**Success Metric:** 10,000 shadow votes in 30 days

### **V2: Prove Traction** (Months 2-6)
- Add 5 states (CA, TX, NY, FL, IL)
- Add narrative comparison (bill vs media coverage)
- Add user organizations/groups
- Launch subscription tier ($10/month)

**Gate to V2:** 1,000 DAU + $5K MRR

### **V3: Add Blockchain** (Month 6+)
- Legal opinion on non-profit crypto operations
- DAO testnet on Rootstock (EVM compatible)
- Non-custodial governance primitives only
- NO stablecoin, NO marketplace

**Gate to V3:** Legal clearance + security audit

---

## 🎯 AGENTIC WORKFLOW STRATEGY

### **The Jules Trap**
Your research shows Jules excels at:
- Issue → PR workflows
- Scheduled maintenance
- CI auto-fix

**But:** Jules is async, requires well-scoped issues, thrashes on ambiguity

### **Recommended Agent Architecture**

```yaml
supervisor: Antigravity
  role: Project brain, maintains PRD, creates scoped issues
  
workers:
  - Jules: 
      use_for: "Implement connector for Congress.gov API"
      avoid: "Design the entire platform"
      
  - Claude Code:
      use_for: Complex logic, algorithms, smart contracts (V3)
      
  - Gemini CLI:
      use_for: Scripted automation, API testing
      
  - Ollama:
      use_for: Local summarization (privacy mode)

workflow:
  1. Antigravity breaks PRD into GitHub issues
  2. Label high-priority issues with `jules`
  3. Jules implements and opens PR
  4. Antigravity reviews and merges
  5. Repeat
```

### **Critical Rules**
1. **One issue = One feature** (no "build the dashboard")
2. **AGENTS.md defines repo conventions** (Jules's steering wheel)
3. **Plan approval required** for anything >100 LOC
4. **Scheduled tasks** for maintenance only (deps, tests, docs)

---

## 📋 CLARIFYING QUESTIONS

Before finalizing the PRD, I need answers to:

### **Scope & Timeline**
1. **What is your launch deadline?** (Impacts V1 scope)
2. **Are you full-time on this?** Or nights/weekends?
3. **What's your budget for APIs/infrastructure?** ($500/month? $5K/month?)

### **Regulatory Comfort**
4. **Are you willing to delay ALL crypto until V3?** (Recommended)
5. **Can V1 mention "future DAO" in marketing?** Or stay silent?
6. **Iran: Information portal only, or voting too?** (OFAC implications)

### **Technical Decisions**
7. **V1 Auth: Email-only, OAuth, or anonymous?**
8. **Data retention: Store IPs for abuse prevention?** Or max privacy?
9. **Public API in V1?** Or internal-only?

### **Success Definition**
10. **What convinces YOU to continue?** (X votes? Y donors? Media coverage?)

---

## 💡 RECOMMENDED NEXT STEPS

1. **Answer the 10 questions above**
2. **Review and approve the "Hardened V1" scope**
3. **I'll generate:**
   - Final PRD with completion tests
   - Roadmap with explicit gates
   - AGENTS.md for Jules automation
   - Initial GitHub issues for V1
4. **We initialize the repo and start the agentic loop**

---

## 🎬 The One Metric That Matters

**V1 Success = 10,000 shadow votes in 30 days**

If you hit this, everything becomes possible.  
If you miss this, nothing else matters.

Let's build the smallest thing that proves people want this.
