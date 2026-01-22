# Jules Integration Guide for UtP

## Overview
Jules.google.com is now connected to the UtP repository. This guide explains how to assign tasks to Jules from your terminal and via GitHub.

---

## Integration Methods

### Method 1: GitHub Issues (RECOMMENDED ⭐)
The primary way to assign tasks to Jules is via GitHub issues.

#### How It Works
1. Create a GitHub issue in your repo
2. Add the label `jules` to the issue
3. Jules automatically picks it up and creates a PR

#### From Terminal
```bash
# Create a new issue and assign to Jules
gh issue create \
  --title "Implement Congress.gov API connector" \
  --body "Build an idempotent connector that fetches bills from Congress.gov API. See /brain/02_TECHNICAL_SPEC.md for schema." \
  --label "jules"

# List all Jules tasks
gh issue list --label "jules"

# View Jules PR status
gh pr list --author "jules-google-ai"
```

#### Issue Template for Jules
```markdown
## Task
[Clear, specific description of what to build]

## Context
- See: /brain/02_TECHNICAL_SPEC.md
- Related: AGENTS.md conventions

## Success Criteria
- [ ] Tests pass
- [ ] Follows AGENTS.md conventions
- [ ] PR includes screenshot/demo

## Files to Modify
- [ ] /lib/connectors/congress.ts
- [ ] /tests/congress.test.ts
```

---

### Method 2: Jules Web Interface
You've already added the repo via jules.google.com. You can also create tasks there.

#### Steps
1. Go to https://jules.google.com
2. Select the `utp` repository
3. Create a new session with a natural language prompt
4. Jules will propose a plan → you approve → Jules implements

#### Best Practices
- Be specific: "Implement X in file Y using pattern Z"
- Reference docs: "See /brain/02_TECHNICAL_SPEC.md for schema"
- Set acceptance criteria: "Must pass /tests/congress.test.ts"

---

### Method 3: Jules REST API (Alpha)
For advanced automation, you can use the Jules API programmatically.

#### API Endpoints
```bash
# Create a session
curl -X POST https://jules.google.com/api/v1/sessions \
  -H "Authorization: Bearer $JULES_API_KEY" \
  -d '{
    "repo": "yourusername/utp",
    "task": "Implement Congress.gov connector",
    "automation_mode": "AUTO_CREATE_PR"
  }'

# List sessions
curl https://jules.google.com/api/v1/sessions \
  -H "Authorization: Bearer $JULES_API_KEY"
```

**Note**: You'll need to generate an API key from jules.google.com settings.

---

## AGENTS.md Integration (Jules's Steering Wheel)

Jules reads `AGENTS.md` at the repo root to understand conventions. Our file already includes:

```markdown
## 📁 Repository Structure
- `/apps/web`: Next.js frontend
- `/lib`: Shared logic (connectors, AI, utils)
- `/brain`: Project documentation

## 🛡️ Coding Conventions
- TypeScript strict mode
- Tailwind CSS for styling
- Idempotent ingestion functions

## 🏁 Definition of Done
1. Tests included
2. Docs updated in /brain/
3. Citations in AI summaries
4. No crypto/stablecoin code in V1
```

This ensures Jules follows our standards automatically.

---

## Sample Task Assignment Workflow

### Scenario: We want Jules to build the Congress.gov connector

#### Step 1: Create an issue
```bash
gh issue create \
  --title "[Jules] Build Congress.gov API Connector" \
  --body-file .github/ISSUE_TEMPLATE/jules_task.md \
  --label "jules,priority:high"
```

#### Step 2: Monitor progress
```bash
# Check if Jules commented on the issue
gh issue view 1

# See the PR Jules created
gh pr list --label "jules"
```

#### Step 3: Review the plan
Jules will comment on the issue with a plan. Review it, then reply:
- "Approved, go ahead" → Jules implements
- "Change X to Y" → Jules revises the plan

#### Step 4: Review the PR
```bash
# Checkout Jules's branch locally
gh pr checkout 1

# Run tests
npm test

# Merge if good
gh pr merge 1 --squash
```

---

## Current Jules Setup Status

### ✅ What's Ready
- [x] Repository connected to jules.google.com
- [x] AGENTS.md created with project conventions
- [x] Brain documentation available for context
- [x] Database schema defined for reference

### 🔄 To Enable GitHub Issue Workflow
You need GitHub CLI (`gh`) for terminal integration:

**Install GitHub CLI:**
```bash
brew install gh
gh auth login
```

**Grant Jules permissions:**
1. Go to https://github.com/settings/installations
2. Find "Jules AI" app
3. Grant access to the `utp` repository

---

## Recommended First Tasks for Jules

### Task #1: Setup Next.js Scaffold
```bash
gh issue create \
  --title "[Jules] Initialize Next.js 14 with Supabase" \
  --body "Setup Next.js App Router, Tailwind, TypeScript. See /brain/02_TECHNICAL_SPEC.md for stack." \
  --label "jules"
```

### Task #2: Implement Database Schema
```bash
gh issue create \
  --title "[Jules] Create Supabase migrations from spec" \
  --body "Convert SQL schema in /brain/02_TECHNICAL_SPEC.md to Supabase migrations." \
  --label "jules"
```

### Task #3: Build Congress.gov Connector
```bash
gh issue create \
  --title "[Jules] Implement Congress.gov API connector" \
  --body "See /brain/02_TECHNICAL_SPEC.md. Must be idempotent and rate-limit aware." \
  --label "jules"
```

---

## Jules Best Practices (From Research)

### ✅ Do This
- **Scoped issues**: One feature per issue (not "build the dashboard")
- **Reference docs**: Always point to /brain/ files for context
- **Set acceptance criteria**: Jules works best with clear "done" definition
- **Use plan approval**: Review before Jules writes code

### ❌ Avoid This
- Vague prompts: "Make it better"
- Scope creep: Adding requirements mid-task
- Ignoring Jules's plan: If plan is off, correct it before implementation

---

## Troubleshooting

### Jules isn't picking up issues
- Check the label is exactly `jules` (lowercase)
- Verify repo was added at jules.google.com
- Ensure Jules app has repo permissions

### Jules's plan is off-target
- Reply to the issue with corrections
- Reference specific docs: "/brain/02_TECHNICAL_SPEC.md line 45"
- Be explicit about what's wrong

### Need help
- Ask in the Jules issue comment thread
- Jules can read previous comments for context

---

## Next Steps

1. **Install GitHub CLI**: `brew install gh && gh auth login`
2. **Create first issue**: Use template above for Next.js setup
3. **Label it `jules`**: Jules will comment with a plan
4. **Review and approve**: Jules implements and opens PR
5. **Merge and repeat**: Ship features faster

The integration is ready. You can now delegate implementation tasks to Jules while focusing on planning and review.
