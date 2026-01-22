# GitHub API Integration Guide

## Overview
This guide covers using GitHub's REST and GraphQL APIs to programmatically manage issues, PRs, projects, and automate the UtP development workflow.

---

## Authentication Methods

### 1. Personal Access Token (Recommended for Scripts)
```typescript
// lib/github/client.ts
import { Octokit } from '@octokit/rest';

export const github = new Octokit({
  auth: process.env.GITHUB_TOKEN
});
```

**Create token:**
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow`, `project`
4. Copy token to `.env`: `GITHUB_TOKEN=ghp_xxxxx`

### 2. GitHub App (Recommended for Production)
```typescript
import { App } from '@octokit/app';

const app = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_PRIVATE_KEY,
});

const octokit = await app.getInstallationOctokit(installationId);
```

---

## Core Operations

### Issues

#### Create Issue
```typescript
// lib/github/issues.ts
export async function createIssue(title: string, body: string, labels: string[]) {
  const { data } = await github.rest.issues.create({
    owner: 'yourusername',
    repo: 'utp',
    title,
    body,
    labels,
  });
  return data;
}

// Usage
await createIssue(
  '[Jules] Build Congress.gov connector',
  'See /brain/02_TECHNICAL_SPEC.md for details',
  ['jules', 'priority:high']
);
```

#### List Issues
```typescript
export async function listJulesTasks() {
  const { data } = await github.rest.issues.listForRepo({
    owner: 'yourusername',
    repo: 'utp',
    labels: 'jules',
    state: 'open',
  });
  return data;
}
```

#### Update Issue
```typescript
export async function updateIssue(issueNumber: number, updates: {
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
}) {
  const { data } = await github.rest.issues.update({
    owner: 'yourusername',
    repo: 'utp',
    issue_number: issueNumber,
    ...updates,
  });
  return data;
}
```

#### Add Comment to Issue
```typescript
export async function commentOnIssue(issueNumber: number, comment: string) {
  const { data } = await github.rest.issues.createComment({
    owner: 'yourusername',
    repo: 'utp',
    issue_number: issueNumber,
    body: comment,
  });
  return data;
}
```

---

### Pull Requests

#### List PRs from Jules
```typescript
export async function listJulesPRs() {
  const { data } = await github.rest.pulls.list({
    owner: 'yourusername',
    repo: 'utp',
    state: 'open',
  });
  
  // Filter PRs from Jules
  return data.filter(pr => pr.user?.login === 'jules-google-ai');
}
```

#### Get PR Details
```typescript
export async function getPR(prNumber: number) {
  const { data } = await github.rest.pulls.get({
    owner: 'yourusername',
    repo: 'utp',
    pull_number: prNumber,
  });
  return data;
}
```

#### Review PR
```typescript
export async function reviewPR(prNumber: number, event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT', body?: string) {
  const { data } = await github.rest.pulls.createReview({
    owner: 'yourusername',
    repo: 'utp',
    pull_number: prNumber,
    event,
    body,
  });
  return data;
}
```

#### Merge PR
```typescript
export async function mergePR(prNumber: number, mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash') {
  const { data } = await github.rest.pulls.merge({
    owner: 'yourusername',
    repo: 'utp',
    pull_number: prNumber,
    merge_method: mergeMethod,
  });
  return data;
}
```

---

### Labels

#### Create Label
```typescript
export async function createLabel(name: string, color: string, description: string) {
  const { data } = await github.rest.issues.createLabel({
    owner: 'yourusername',
    repo: 'utp',
    name,
    color, // hex without #
    description,
  });
  return data;
}

// Setup project labels
await createLabel('jules', '0E8A16', 'Tasks for Jules AI agent');
await createLabel('priority:high', 'D93F0B', 'High priority task');
await createLabel('priority:medium', 'FBCA04', 'Medium priority task');
await createLabel('priority:low', '0075CA', 'Low priority task');
```

---

### Projects (GitHub Projects V2)

#### Create Project
```typescript
export async function createProject(title: string, body: string) {
  // Note: Projects V2 requires GraphQL API
  const query = `
    mutation($ownerId: ID!, $title: String!, $body: String!) {
      createProjectV2(input: {ownerId: $ownerId, title: $title, body: $body}) {
        projectV2 {
          id
          url
        }
      }
    }
  `;
  
  const result = await github.graphql(query, {
    ownerId: 'YOUR_USER_ID', // Get from: gh api user --jq .node_id
    title,
    body,
  });
  
  return result;
}
```

#### Add Issue to Project
```typescript
export async function addIssueToProject(projectId: string, issueId: string) {
  const mutation = `
    mutation($projectId: ID!, $contentId: ID!) {
      addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
        item {
          id
        }
      }
    }
  `;
  
  return await github.graphql(mutation, { projectId, contentId: issueId });
}
```

---

### Webhooks

#### Create Webhook
```typescript
export async function createWebhook(url: string, events: string[]) {
  const { data } = await github.rest.repos.createWebhook({
    owner: 'yourusername',
    repo: 'utp',
    config: {
      url,
      content_type: 'json',
      secret: process.env.WEBHOOK_SECRET,
    },
    events, // e.g., ['issues', 'pull_request', 'push']
  });
  return data;
}
```

#### Handle Webhook (Next.js API Route)
```typescript
// app/api/webhooks/github/route.ts
import { verify } from '@octokit/webhooks-methods';

export async function POST(request: Request) {
  const payload = await request.text();
  const signature = request.headers.get('x-hub-signature-256');
  
  // Verify webhook signature
  const isValid = await verify(
    process.env.WEBHOOK_SECRET!,
    payload,
    signature!
  );
  
  if (!isValid) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const event = JSON.parse(payload);
  
  // Handle different event types
  if (event.action === 'opened' && event.issue) {
    // New issue created
    console.log('New issue:', event.issue.title);
    
    // Auto-label based on content
    if (event.issue.title.includes('[Jules]')) {
      await github.rest.issues.addLabels({
        owner: event.repository.owner.login,
        repo: event.repository.name,
        issue_number: event.issue.number,
        labels: ['jules'],
      });
    }
  }
  
  return new Response('OK', { status: 200 });
}
```

---

## GraphQL API (More Powerful)

### Query Issues with Full Details
```typescript
export async function getIssuesWithDetails() {
  const query = `
    query($owner: String!, $repo: String!) {
      repository(owner: $owner, name: $repo) {
        issues(first: 20, labels: ["jules"], states: OPEN) {
          nodes {
            number
            title
            body
            createdAt
            labels(first: 10) {
              nodes {
                name
              }
            }
            comments(last: 5) {
              nodes {
                author {
                  login
                }
                body
                createdAt
              }
            }
          }
        }
      }
    }
  `;
  
  const result = await github.graphql(query, {
    owner: 'yourusername',
    repo: 'utp',
  });
  
  return result;
}
```

---

## Automation Scripts

### Auto-create Jules Tasks from PRD
```typescript
// scripts/create-jules-tasks.ts
import { createIssue } from '../lib/github/issues';
import * as fs from 'fs';
import * as path from 'path';

async function createTasksFromPRD() {
  // Read task.md
  const taskMd = fs.readFileSync(
    path.join(__dirname, '../brain/task.md'),
    'utf-8'
  );
  
  // Parse uncompleted tasks
  const tasks = taskMd
    .split('\n')
    .filter(line => line.startsWith('- [ ]'))
    .map(line => line.replace('- [ ]', '').trim());
  
  // Create GitHub issues for each
  for (const task of tasks) {
    await createIssue(
      `[Jules] ${task}`,
      `See /brain/task.md and /brain/implementation_plan.md for context.`,
      ['jules', 'auto-generated']
    );
    
    console.log(`✓ Created issue: ${task}`);
  }
}

createTasksFromPRD();
```

### Monitor Jules PRs and Auto-merge if Tests Pass
```typescript
// scripts/auto-merge-jules.ts
import { listJulesPRs, getPR, mergePR } from '../lib/github/issues';

async function autoMergeJulesPRs() {
  const prs = await listJulesPRs();
  
  for (const pr of prs) {
    // Check if CI passed
    const { data: checks } = await github.rest.checks.listForRef({
      owner: 'yourusername',
      repo: 'utp',
      ref: pr.head.sha,
    });
    
    const allPassed = checks.check_runs.every(
      run => run.conclusion === 'success'
    );
    
    if (allPassed && pr.mergeable) {
      await mergePR(pr.number, 'squash');
      console.log(`✓ Auto-merged PR #${pr.number}: ${pr.title}`);
    }
  }
}

// Run every 5 minutes
setInterval(autoMergeJulesPRs, 5 * 60 * 1000);
```

---

## Integration with Jules Workflow

### Automated Issue→Jules→PR→Merge Pipeline
```typescript
// lib/automation/jules-pipeline.ts
export async function automateJulesWorkflow() {
  // 1. Create issue from task.md
  const issue = await createIssue(
    '[Jules] Build feature X',
    'Description here',
    ['jules']
  );
  
  // 2. Wait for Jules to comment with plan (poll every 30s)
  let plan = null;
  while (!plan) {
    await new Promise(r => setTimeout(r, 30000));
    const comments = await getIssueComments(issue.number);
    plan = comments.find(c => c.user?.login === 'jules-google-ai');
  }
  
  // 3. Auto-approve if plan looks good (simple validation)
  if (plan.body.includes('Success Criteria')) {
    await commentOnIssue(issue.number, 'LGTM, approved!');
  }
  
  // 4. Wait for PR
  let pr = null;
  while (!pr) {
    await new Promise(r => setTimeout(r, 60000));
    const prs = await listJulesPRs();
    pr = prs.find(p => p.body?.includes(`#${issue.number}`));
  }
  
  // 5. Run tests and auto-merge
  // (CI handles this via GitHub Actions)
  
  return { issue, pr };
}
```

---

## Environment Variables

Add to `.env.local`:
```bash
# GitHub API
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
GITHUB_WEBHOOK_SECRET=your_webhook_secret

# For GitHub App (optional)
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
```

---

## Rate Limits

### Check Rate Limit
```typescript
export async function checkRateLimit() {
  const { data } = await github.rest.rateLimit.get();
  console.log('Core:', data.resources.core);
  console.log('GraphQL:', data.resources.graphql);
  return data;
}
```

**Limits:**
- **Authenticated**: 5,000 requests/hour
- **GraphQL**: 5,000 points/hour
- **Webhooks**: Unlimited (but must respond quickly)

---

## Best Practices

1. **Cache responses** to avoid rate limits
2. **Use GraphQL** for complex queries (more efficient)
3. **Webhooks > Polling** for real-time updates
4. **Store tokens securely** (never in git)
5. **Handle errors gracefully** (API can be down)

---

## Package Installation

```bash
npm install @octokit/rest @octokit/app @octokit/webhooks-methods
```

---

## Next Steps

1. Create `/lib/github/client.ts` with Octokit setup
2. Add helper functions in `/lib/github/issues.ts`
3. Setup webhook endpoint at `/api/webhooks/github`
4. Create automation scripts in `/scripts/`
5. Test with: `npm run github:test`

This gives you **full programmatic control** over GitHub for the UtP project.
