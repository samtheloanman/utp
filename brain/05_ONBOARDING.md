# Repository Onboarding Checklist

## Current Status
- ✅ Local repository initialized with 7 commits
- ✅ All brain documentation created (PRD, specs, tests, Jules guide)
- ✅ AGENTS.md and issue templates ready
- ⏳ **Next**: Push to GitHub and activate Jules

---

## Step 1: Create GitHub Repository

### Option A: Via GitHub Web UI (Recommended)
1. Go to https://github.com/new
2. Repository name: `utp`
3. Description: "United the People - AI-native civic transparency platform"
4. **Public** (required for Jules free tier)
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

### Option B: Via GitHub CLI
```bash
gh repo create utp --public --source=. --remote=origin
```

---

## Step 2: Push Local Code to GitHub

```bash
# If you created via web UI, add the remote
git remote add origin git@github.com:YOUR_USERNAME/utp.git

# Or use HTTPS
git remote add origin https://github.com/YOUR_USERNAME/utp.git

# Push all commits
git push -u origin main

# Verify
git remote -v
```

---

## Step 3: Grant Jules Access

### Via Jules Web Interface
1. Go to https://jules.google.com
2. Click "Add Repository"
3. Search for your `utp` repository
4. Grant permissions when prompted

### Via GitHub Settings (Alternative)
1. Go to https://github.com/settings/installations
2. Find "Jules AI" in installed apps
3. Click "Configure"
4. Under "Repository access", select "Only select repositories"
5. Choose `utp` from the dropdown
6. Click "Save"

---

## Step 4: Create First Issues for Jules

Once the repo is pushed and Jules has access, create these issues:

### Issue #1: Next.js Scaffold
```bash
gh issue create \
  --repo YOUR_USERNAME/utp \
  --title "[Jules] Initialize Next.js 14 with TypeScript and Tailwind" \
  --label "jules,priority:high" \
  --body "Setup Next.js App Router with TypeScript strict mode and Tailwind CSS.

**Context:**
- See /brain/02_TECHNICAL_SPEC.md for stack details
- Follow /AGENTS.md coding conventions

**Success Criteria:**
- [ ] Next.js 14 with App Router
- [ ] TypeScript strict mode enabled
- [ ] Tailwind CSS configured
- [ ] Project runs with \`npm run dev\`
- [ ] No build errors

**Files to Create:**
- [ ] next.config.ts
- [ ] tsconfig.json  
- [ ] tailwind.config.ts
- [ ] app/layout.tsx
- [ ] app/page.tsx"
```

### Issue #2: Supabase Setup
```bash
gh issue create \
  --repo YOUR_USERNAME/utp \
  --title "[Jules] Create Supabase migrations from database spec" \
  --label "jules,priority:high" \
  --body "Convert the SQL schema from /brain/02_TECHNICAL_SPEC.md into Supabase migration files.

**Context:**
- Schema is in /brain/02_TECHNICAL_SPEC.md lines 15-120
- Must include RLS policies

**Success Criteria:**
- [ ] Migration files in /supabase/migrations/
- [ ] All 9 tables created (jurisdictions, data_sources, bills, etc.)
- [ ] Indexes created
- [ ] RLS policies applied
- [ ] Migration runs successfully

**Files to Create:**
- [ ] supabase/migrations/20260121_init_schema.sql
- [ ] supabase/config.toml"
```

### Issue #3: Congress.gov Connector
```bash
gh issue create \
  --repo YOUR_USERNAME/utp \
  --title "[Jules] Implement Congress.gov API connector" \
  --label "jules,priority:medium" \
  --body "Build an idempotent connector that fetches bills from the Congress.gov API.

**Context:**
- API docs: https://api.congress.gov/
- Schema mapping in /brain/02_TECHNICAL_SPEC.md
- Must respect 5,000 req/hour rate limit

**Success Criteria:**
- [ ] Connector in /lib/connectors/congress.ts
- [ ] Fetches bills with all metadata
- [ ] Normalizes to our schema
- [ ] Idempotent (safe to rerun)
- [ ] Rate limit handling
- [ ] Tests in /tests/congress.test.ts
- [ ] Tests pass

**Files to Create:**
- [ ] /lib/connectors/congress.ts
- [ ] /lib/connectors/types.ts
- [ ] /tests/congress.test.ts"
```

---

## Step 5: Monitor Jules's Work

```bash
# Check if Jules commented on issues
gh issue list --label "jules"

# View a specific issue
gh issue view 1

# See PRs from Jules
gh pr list --author "jules-google-ai"

# Review a PR locally
gh pr checkout 2
npm test
npm run build
```

---

## Step 6: First Merge & Iteration

Once Jules opens a PR:
1. Review the plan in the issue comments
2. Check out the PR locally and test
3. Request changes if needed (comment on PR)
4. Merge when ready: `gh pr merge 1 --squash`
5. Repeat with next issue

---

## Quick Start Script

Save this as `scripts/onboard.sh`:

```bash
#!/bin/bash
set -e

echo "📦 Onboarding UtP repository..."

# 1. Create GitHub repo
gh repo create utp --public --source=. --remote=origin

# 2. Push code
git push -u origin main

# 3. Create first issues
gh issue create \
  --title "[Jules] Initialize Next.js 14 with TypeScript and Tailwind" \
  --label "jules,priority:high" \
  --body-file .github/ISSUE_TEMPLATE/nextjs_setup.md

gh issue create \
  --title "[Jules] Create Supabase migrations from database spec" \
  --label "jules,priority:high" \
  --body-file .github/ISSUE_TEMPLATE/supabase_setup.md

echo "✅ Repository onboarded! Visit https://jules.google.com to grant access."
echo "Then Jules will start working on the issues automatically."
```

---

## Verification Checklist

Before considering onboarding complete:

- [ ] Repository exists on GitHub
- [ ] All 7 commits pushed to `main` branch
- [ ] Jules has repository access (check at jules.google.com)
- [ ] At least 2 issues created with `jules` label
- [ ] GitHub CLI configured (`gh auth status` works)
- [ ] AGENTS.md is visible at repo root on GitHub
- [ ] Brain documentation is accessible in `/brain/` folder

---

## Troubleshooting

### "Repository already exists"
Use a different name or delete the existing repo first.

### "Jules isn't commenting on issues"
- Wait 2-5 minutes (Jules runs async)
- Check that the `jules` label is applied
- Verify Jules has repo access at https://github.com/settings/installations

### "gh command not found"
```bash
brew install gh
gh auth login
```

---

## Next Steps After Onboarding

1. **Monitor Issue #1** - Next.js setup (usually takes 5-10 minutes)
2. **Review and merge PR #1**
3. **Create Issue #4** - AI Summarization pipeline
4. **Create Issue #5** - Shadow voting UI
5. **Continue iterating** until V1 is complete

The onboarding process should take **15-20 minutes** total.
