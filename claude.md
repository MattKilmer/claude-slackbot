# Claude Context Document - Claude AutoFix Bot

> **Purpose:** This file provides comprehensive context for LLM agents (Claude, GPT, etc.) working on this codebase. Read this FIRST before making any changes.

---

## 🎯 Project Overview

**Name:** Claude AutoFix Bot
**Type:** Production-ready AI-powered development automation system
**Status:** MVP complete, ready for configuration and deployment
**Repository:** https://github.com/MattKilmer/claude-slackbot

### What This System Does

This is an **automated code fixing pipeline** that:

1. **Monitors** a Slack channel for bug reports/feature requests (natural language)
2. **Analyzes** the codebase using Claude 3.7 Sonnet AI
3. **Generates** code fixes automatically
4. **Creates** a new Git branch with semantic naming (`fix/`, `feat/`, etc.)
5. **Commits** changes with descriptive messages
6. **Pushes** to GitHub and creates a Pull Request
7. **Deploys** to Vercel preview environment
8. **Reports** back to Slack with PR link + preview URL

### Key Innovation

Unlike GitHub Copilot or Cursor (IDE-based), this works in **Slack** where teams communicate. Non-technical PMs/designers can request fixes, and the system handles the entire workflow end-to-end.

---

## 🏗️ Architecture

### High-Level Flow

```
Slack Message (user reports bug)
    ↓
Slack Events API Webhook (verified with signature)
    ↓
Vercel Serverless Function (instant 200 OK acknowledgment)
    ↓
Async Job Queue (in-memory, with retry logic)
    ↓
Issue Processor (main orchestration - see src/handlers/issue-processor.ts)
    ↓
┌─────────────┬──────────────┬────────────┬──────────────┐
│             │              │            │              │
Clone/Pull    Claude Agent   Create       Push + Create
Repository    (AI Analysis)  Git Branch   Pull Request
│             │              │            │              │
└─────────────┴──────────────┴────────────┴──────────────┘
                             ↓
                    Vercel Auto-Deploy (preview)
                             ↓
                    Poll for Deployment URL
                             ↓
                    Post Results to Slack ✅
```

### Technology Stack

- **Runtime:** Node.js 20+ with TypeScript (strict mode)
- **Hosting:** Vercel serverless functions
- **AI:** Claude 3.7 Sonnet via @anthropic-ai/sdk
- **Git:** simple-git library + GitHub REST API (Octokit)
- **Slack:** @slack/web-api + Events API
- **Deployment:** Vercel API (optional, uses GitHub integration by default)
- **Validation:** Zod for runtime type checking
- **Build:** TypeScript compiler (tsc)

### Design Patterns

- **Event-Driven:** Slack webhook triggers async pipeline
- **Queue-Based:** Jobs processed sequentially with retry logic
- **Fail-Safe:** Comprehensive error handling at every step
- **Stateless:** No database required (MVP), all state in git/Slack
- **Observable:** Structured JSON logging + real-time Slack updates

---

## 📂 Codebase Structure

### Critical Files (Touch these with care!)

| File | Purpose | Key Points |
|------|---------|------------|
| `src/handlers/issue-processor.ts` | **Main orchestration** | 400+ lines, handles entire pipeline. This is the heart of the system. |
| `src/services/claude/agent.ts` | **AI integration** | Calls Claude API, parses JSON responses, applies file changes. |
| `src/services/git/automation.ts` | **Git operations** | Clone, branch, commit, push. Handles authentication. |
| `src/services/git/github-api.ts` | **PR creation** | Uses Octokit to create PRs with formatted descriptions. |
| `src/config/index.ts` | **Configuration** | Validates all env vars with Zod. Fails fast if misconfigured. |
| `api/slack-events.ts` | **Webhook endpoint** | Verifies signatures, queues jobs, returns 200 OK within 3s. |

### Directory Map

```
claude-slackbot/
├── api/                          # Vercel serverless functions
│   ├── slack-events.ts           # Slack Events API webhook (POST /api/slack-events)
│   └── health.ts                 # Health check (GET /api/health)
│
├── src/
│   ├── config/
│   │   └── index.ts              # Environment variable loading + validation
│   │
│   ├── types/
│   │   └── index.ts              # All TypeScript interfaces & Zod schemas
│   │
│   ├── services/                 # External service integrations
│   │   ├── slack/
│   │   │   └── client.ts         # Slack Web API wrapper
│   │   ├── claude/
│   │   │   └── agent.ts          # Claude AI integration
│   │   ├── git/
│   │   │   ├── automation.ts     # Git operations (clone, branch, commit, push)
│   │   │   └── github-api.ts     # GitHub REST API (PR creation, labels)
│   │   └── deployment/
│   │       └── vercel.ts         # Vercel deployment tracking
│   │
│   ├── handlers/
│   │   └── issue-processor.ts   # MAIN ORCHESTRATION - wires everything together
│   │
│   └── utils/
│       ├── logger.ts             # Structured logging (JSON in prod, colored in dev)
│       └── queue.ts              # In-memory job queue with retry logic
│
├── docs/                         # Documentation
│   ├── README.md                 # Project overview
│   ├── QUICKSTART.md             # Setup guide for new users
│   └── MASTER-PLAN.md            # Product roadmap + v2 architecture
│
└── Configuration files
    ├── package.json              # Dependencies + scripts
    ├── tsconfig.json             # TypeScript configuration
    ├── vercel.json               # Vercel deployment settings
    └── .env.example              # Environment variable template
```

---

## 🔑 Environment Variables

### Required for MVP

| Variable | Description | Where to Get | Example |
|----------|-------------|--------------|---------|
| `SLACK_BOT_TOKEN` | Bot OAuth token | Slack App → OAuth & Permissions | `xoxb-123...` |
| `SLACK_SIGNING_SECRET` | Webhook verification | Slack App → Basic Information | `abc123...` |
| `SLACK_CHANNEL_ID` | Channel to monitor | Right-click channel → Copy ID | `C01234567` |
| `ANTHROPIC_API_KEY` | Claude API key | console.anthropic.com | `sk-ant-...` |
| `GITHUB_TOKEN` | Personal access token | github.com/settings/tokens | `ghp_...` |
| `GITHUB_USERNAME` | GitHub username | Your profile | `your-username` |
| `TARGET_REPO_URL` | Repo to fix | GitHub repo URL | `https://github.com/your-org/your-repo.git` |
| `BASE_BRANCH` | Main branch name | Usually `main` or `master` | `main` |

### Optional (for Vercel API)

| Variable | Description | Default Behavior |
|----------|-------------|------------------|
| `VERCEL_TOKEN` | Vercel API token | Uses GitHub integration instead |
| `VERCEL_PROJECT_ID` | Vercel project ID | Skips deployment tracking |
| `VERCEL_ORG_ID` | Vercel org/team ID | Relies on auto-deploy |

### Configuration Rules

- **Validation:** All variables validated with Zod at startup
- **Fail-Fast:** Missing required vars = immediate error with helpful message
- **Security:** Never commit `.env.local` (in .gitignore)
- **Development:** Use `.env.local` (loaded by dotenv)
- **Production:** Set in Vercel dashboard → Settings → Environment Variables

---

## 🔄 Data Flow & State Management

### Job Lifecycle

1. **Slack Message Received**
   - User posts: `"Fix the navigation bug on mobile"`
   - Webhook triggered: `POST /api/slack-events`

2. **Signature Verification**
   - Validates `x-slack-signature` header
   - Prevents replay attacks (timestamp check)
   - Returns 401 if invalid

3. **Job Creation**
   ```typescript
   IssueJob {
     id: slack_timestamp,
     text: "Fix the navigation bug...",
     channel: "C01234567",
     threadTs: "1234567890.123456",
     userId: "U01234567",
     timestamp: new Date(),
     retryCount: 0
   }
   ```

4. **Async Processing**
   - Job added to in-memory queue
   - Immediate 200 OK returned to Slack (within 3 seconds!)
   - Processing happens in background

5. **Orchestration Pipeline**
   - See `src/handlers/issue-processor.ts` for complete flow
   - Each step updates Slack message in real-time
   - Errors are caught and reported gracefully

6. **Final Result**
   ```typescript
   JobResult {
     status: 'completed',
     branchName: 'fix/navigation-bug-mobile',
     prUrl: 'https://github.com/...',
     previewUrl: 'https://preview.vercel.app/...'
   }
   ```

### State Storage

- **No database** - Stateless design
- **Git as source of truth** - All changes in version control
- **Slack as UI** - Messages show current state
- **Queue in memory** - Jobs lost on restart (acceptable for MVP)

**For v2 (scale):** Add PostgreSQL for job history, analytics, multi-tenancy

---

## 🤖 Claude Integration Details

### How It Works

1. **Context Gathering**
   ```typescript
   // Reads from target repository
   - package.json (dependencies, scripts)
   - README.md (first 1500 chars)
   - Top-level directory structure
   ```

2. **System Prompt**
   - Instructs Claude to be a "senior software engineer"
   - Emphasizes: minimal changes, production-ready, complete file content (not diffs)
   - Specifies JSON response format

3. **Expected Response Format**
   ```json
   {
     "analysis": "The navigation menu has a z-index issue...",
     "solution": "Updated CSS to fix stacking context",
     "fixes": [
       {
         "path": "src/components/Nav.tsx",
         "description": "Fixed z-index for mobile menu",
         "newContent": "COMPLETE file content here..."
       }
     ]
   }
   ```

4. **File Application**
   - Overwrites files with `newContent` from Claude
   - Creates backups in `originalContent` field
   - Handles new file creation (mkdir -p for directories)

### Important Notes

- **Claude must return complete file contents**, not diffs
- **JSON parsing is resilient** - extracts JSON from markdown code blocks
- **Fallback behavior** - If JSON parsing fails, treats entire response as analysis
- **Token limits** - Max 8000 tokens by default (configurable)

### Prompt Engineering Best Practices

Current system prompt emphasizes:
- ✅ "Be precise, surgical, and thorough"
- ✅ "Provide complete file contents, not diffs"
- ✅ "Maintain existing code style"
- ✅ "Test your logic mentally before responding"
- ✅ "This will be automatically deployed - make it production-ready"

**When modifying prompts:**
- Keep JSON format requirement strict
- Emphasize completeness (no "// rest of file unchanged" comments)
- Include safety checks ("Will this break existing functionality?")

---

## 🔐 Security Considerations

### Current Security Measures

1. **Slack Signature Verification**
   ```typescript
   // Prevents unauthorized webhook calls
   // Uses timing-safe comparison
   // Checks timestamp to prevent replay attacks
   ```

2. **GitHub Token Handling**
   ```typescript
   // Token injected into git URLs for authentication
   // Format: https://username:token@github.com/...
   // Removed from logs and error messages
   ```

3. **Environment Variable Protection**
   - All secrets in environment variables
   - Never committed to git (.env.local in .gitignore)
   - Validated at startup with helpful error messages

4. **Input Validation**
   - Zod schemas validate all external data
   - Slack events parsed and validated
   - Git operations sanitized (branch names, commit messages)

### Security Todos for Production

- [ ] Add rate limiting per Slack team/user
- [ ] Implement allowlist for target repositories
- [ ] Add approval workflow for sensitive changes
- [ ] Audit logging for all operations
- [ ] Secret rotation mechanism
- [ ] SOC 2 compliance checklist

---

## 🧪 Testing Strategy

### Current Test Coverage

**Status:** No automated tests yet (MVP focused on functionality)

**Manual Testing Checklist:**
1. Health endpoint: `curl localhost:3000/api/health`
2. Slack webhook: Post message in monitored channel
3. Git operations: Verify branch created on GitHub
4. PR creation: Check PR format and labels
5. Slack updates: Confirm real-time status messages

### Recommended Test Suite (v2)

```typescript
// Unit Tests (Vitest)
describe('ClaudeAgentService', () => {
  test('parses JSON response correctly')
  test('handles markdown-wrapped JSON')
  test('applies file changes to correct paths')
})

describe('GitAutomationService', () => {
  test('creates branch with semantic naming')
  test('handles authentication correctly')
  test('commits with formatted messages')
})

// Integration Tests
describe('Issue Processor', () => {
  test('full pipeline with mock services')
  test('error recovery and retry logic')
  test('Slack message updates at each step')
})

// E2E Tests (Playwright)
describe('End-to-End', () => {
  test('Slack → Claude → PR → Deploy → Notify')
})
```

### How to Add Tests

1. Install test dependencies (already in package.json):
   ```bash
   npm install --save-dev vitest @vitest/ui
   ```

2. Create `tests/` directory structure:
   ```
   tests/
   ├── unit/
   ├── integration/
   └── e2e/
   ```

3. Run tests:
   ```bash
   npm test
   ```

---

## 🚀 Deployment Guide

### Local Development

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local from template
cp .env.example .env.local
# Edit .env.local with your credentials

# 3. Start dev server
npm run dev
# Server runs on http://localhost:3000

# 4. Expose webhook (in another terminal)
ngrok http 3000
# Copy HTTPS URL (e.g., https://abc123.ngrok.io)

# 5. Configure Slack Event Subscriptions
# Set Request URL to: https://abc123.ngrok.io/api/slack-events
```

### Production Deployment (Vercel)

```bash
# Option 1: Vercel CLI
npm install -g vercel
vercel login
vercel --prod

# Option 2: GitHub Integration (Recommended)
# 1. Go to vercel.com/new
# 2. Import GitHub repo
# 3. Add environment variables
# 4. Deploy (auto-deploys on every push to main)
```

### Post-Deployment Checklist

- [ ] Update Slack Event Subscriptions URL to production
- [ ] Test health endpoint: `curl https://your-app.vercel.app/api/health`
- [ ] Send test message in Slack
- [ ] Verify PR created successfully
- [ ] Check Vercel function logs for errors

---

## 🐛 Common Issues & Solutions

### Issue: "Invalid Slack signature"

**Causes:**
- Wrong `SLACK_SIGNING_SECRET`
- Request timestamp too old (>5 minutes)
- ngrok tunnel expired (local dev)

**Solutions:**
1. Verify signing secret from Slack app settings
2. Restart ngrok and update Slack webhook URL
3. Check system clock is synchronized

### Issue: "Claude API error"

**Causes:**
- Invalid `ANTHROPIC_API_KEY`
- API rate limits exceeded
- Network timeout

**Solutions:**
1. Verify API key at console.anthropic.com
2. Check API usage/limits in dashboard
3. Increase timeout in Claude service (default: 120s)

### Issue: "Git push failed"

**Causes:**
- Invalid `GITHUB_TOKEN`
- Insufficient permissions (needs `repo` scope)
- Token expired
- Repository doesn't exist

**Solutions:**
1. Generate new token at github.com/settings/tokens
2. Ensure `repo` and `workflow` scopes are selected
3. Verify `TARGET_REPO_URL` is correct
4. Check repository permissions (must be able to push)

### Issue: "Vercel deployment not found"

**Causes:**
- GitHub → Vercel integration not configured
- Vercel credentials missing/invalid
- Branch not deployed automatically

**Solutions:**
1. Set up Vercel GitHub integration (recommended)
2. Or add Vercel API credentials to `.env.local`
3. Check Vercel project settings → Git integration
4. Note: Deployment tracking is optional for MVP

### Issue: "Job stuck in queue"

**Causes:**
- Exception in job processing
- Infinite retry loop
- Queue handler not initialized

**Solutions:**
1. Check Vercel function logs for errors
2. Restart the application (`vercel dev` or redeploy)
3. Verify `jobQueue.setHandler()` is called in slack-events.ts

---

## 📊 Monitoring & Observability

### Current Logging

**Logger Behavior:**
- **Development:** Colored console output with timestamps
- **Production:** Structured JSON logs for parsing

**Log Levels:**
```typescript
logger.debug()  // Detailed debugging info
logger.info()   // General info (job started, completed)
logger.warn()   // Non-critical issues (reaction failed, etc.)
logger.error()  // Errors that need attention
logger.success() // Successes (✅ emoji)
logger.failure() // Failures (❌ emoji)
logger.processing() // In-progress (⚙️ emoji)
```

### Where to Find Logs

**Local Development:**
```bash
# Terminal where you ran `npm run dev`
# All logs appear in real-time
```

**Production (Vercel):**
```bash
# Option 1: Vercel Dashboard
vercel.com → Your Project → Functions → Logs

# Option 2: Vercel CLI
vercel logs

# Option 3: Real-time
vercel logs --follow
```

### Key Metrics to Monitor

For production monitoring (v2), track:
- **Success Rate:** % of jobs that complete successfully
- **Average Time:** Time from Slack message → PR posted
- **Error Rate:** Failed jobs / total jobs
- **Claude Token Usage:** Track API costs
- **Queue Length:** Detect backlog issues

**Recommended Tools (v2):**
- Sentry (error tracking)
- Vercel Analytics (performance)
- Custom dashboard with Postgres + Grafana

---

## 🔄 Git Workflow

### Branch Naming Convention

Automatically determined from issue text:

| Keywords | Branch Prefix | Example |
|----------|---------------|---------|
| bug, fix, error | `fix/` | `fix/navigation-menu-mobile` |
| feature, add, implement | `feat/` | `feat/dark-mode-toggle` |
| refactor, improve, optimize | `refactor/` | `refactor/authentication-async` |
| (default) | `chore/` | `chore/update-dependencies` |

### Commit Message Format

```
🤖 Auto-fix: [first 50 chars of issue]

[Claude's solution description]

Files changed:
- src/components/Nav.tsx
- src/styles/nav.css

---
🤖 Generated by Claude AutoFix Bot
Co-authored-by: Claude <noreply@anthropic.com>
```

### Pull Request Format

**Title:** `[emoji] [type]: [description]`
- 🐛 Fix: ...
- ✨ Feature: ...
- ♻️ Refactor: ...

**Body:**
```markdown
## 🤖 Automated Fix by Claude

### Analysis
[Claude's analysis of the issue]

### Solution Applied
[Description of the fix]

### Files Changed (N)
- `path/to/file1.ts`
- `path/to/file2.css`

### Testing
- [ ] Verify fix works as expected
- [ ] Check for any regressions
- [ ] Review code changes for quality

---
🤖 This PR was automatically generated by Claude AutoFix Bot
Co-authored-by: Claude <noreply@anthropic.com>
```

**Labels:** Automatically adds `automated` and `claude-fix`

---

## 🎯 Product Roadmap

### MVP (v1) - ✅ COMPLETE

- [x] Slack webhook integration
- [x] Claude AI code analysis
- [x] Git branch creation + commits
- [x] GitHub PR automation
- [x] Vercel deployment tracking
- [x] Real-time Slack updates
- [x] Error handling + retry logic
- [x] TypeScript + strict mode
- [x] Comprehensive documentation

### v2 - Scale & Monetization

**Database Layer:**
- [ ] PostgreSQL for job history
- [ ] Multi-tenant support (multiple Slack workspaces)
- [ ] Usage tracking and analytics
- [ ] User preferences storage

**Billing & SaaS:**
- [ ] Stripe integration
- [ ] Plan tiers (Free/Pro/Enterprise)
- [ ] Usage metering (fixes per month)
- [ ] Billing portal

**Advanced Features:**
- [ ] Approval workflows (for Enterprise)
- [ ] Custom prompt templates per team
- [ ] Multiple repository support
- [ ] Rollback capability
- [ ] Scheduled fixes
- [ ] Interactive Slack buttons (Approve/Reject)

**Integrations:**
- [ ] GitLab support
- [ ] Bitbucket support
- [ ] Netlify/Railway/Render deployment platforms
- [ ] Linear/Jira issue tracking sync

**Observability:**
- [ ] Sentry error tracking
- [ ] Custom analytics dashboard
- [ ] Audit logging
- [ ] Performance monitoring

See `MASTER-PLAN.md` for detailed v2 architecture.

---

## 🧠 AI Agent Guidelines

### When Making Changes

**DO:**
- ✅ Read this file first
- ✅ Understand the full pipeline before modifying
- ✅ Test changes locally before committing
- ✅ Update documentation if you change behavior
- ✅ Follow existing code style and patterns
- ✅ Add TypeScript types for new code
- ✅ Handle errors gracefully
- ✅ Log important events

**DON'T:**
- ❌ Remove error handling without replacement
- ❌ Change API contracts without updating callers
- ❌ Commit secrets or credentials
- ❌ Break the build (run `npm run build` first)
- ❌ Skip signature verification on webhooks
- ❌ Return non-200 status to Slack webhook within 3s
- ❌ Modify Claude prompts without testing thoroughly

### Code Review Checklist

Before committing changes, verify:

1. **Type Safety**
   ```bash
   npm run type-check  # Should pass with no errors
   ```

2. **Build**
   ```bash
   npm run build  # Should complete successfully
   ```

3. **Lint**
   ```bash
   npm run lint  # Should pass (or fix issues)
   ```

4. **Documentation**
   - Update README.md if user-facing changes
   - Update QUICKSTART.md if setup process changes
   - Update this file (claude.md) if architecture changes

5. **Security**
   - No hardcoded secrets
   - Environment variables for all credentials
   - Proper input validation

### File Modification Priority

| Priority | Files | Reason |
|----------|-------|--------|
| **HIGH** | `issue-processor.ts`, `claude/agent.ts` | Core business logic - test thoroughly |
| **MEDIUM** | Services (git, github, slack, vercel) | External integrations - changes may break flow |
| **LOW** | Utils (logger, queue), config | Isolated utilities - safer to modify |
| **NEVER** | `.env.local`, `node_modules/` | Secrets or generated code |

### Testing Changes

**Minimal Test:**
```bash
# 1. Build check
npm run build

# 2. Type check
npm run type-check

# 3. Start dev server
npm run dev

# 4. Test health endpoint
curl localhost:3000/api/health
```

**Full E2E Test:**
```bash
# 1. Start dev server
npm run dev

# 2. Start ngrok
ngrok http 3000

# 3. Update Slack webhook URL
# (Copy ngrok HTTPS URL)

# 4. Post test message in Slack
# "Fix the typo in README.md"

# 5. Verify:
# - Bot reacts with 👀
# - Status updates appear
# - Branch created on GitHub
# - PR created successfully
# - Results posted to Slack ✅
```

---

## 📚 Additional Resources

### Documentation Files

| File | Purpose | Audience |
|------|---------|----------|
| `README.md` | Project overview, features, architecture | End users, potential customers |
| `QUICKSTART.md` | Step-by-step setup guide | New developers, first-time setup |
| `MASTER-PLAN.md` | Full product roadmap, v2 architecture | Product managers, investors |
| `claude.md` (this file) | Technical context for AI agents | LLMs, future developers |

### External Links

- **Slack API Docs:** https://api.slack.com/
- **Claude API Docs:** https://docs.anthropic.com/
- **GitHub API Docs:** https://docs.github.com/en/rest
- **Vercel Docs:** https://vercel.com/docs
- **TypeScript Handbook:** https://www.typescriptlang.org/docs/

### Key Dependencies

| Package | Version | Purpose | Docs |
|---------|---------|---------|------|
| `@anthropic-ai/sdk` | ^0.32.1 | Claude API client | [Link](https://github.com/anthropics/anthropic-sdk-typescript) |
| `@slack/web-api` | ^7.8.0 | Slack Web API | [Link](https://slack.dev/node-slack-sdk/) |
| `@octokit/rest` | ^21.0.2 | GitHub API client | [Link](https://octokit.github.io/rest.js/) |
| `simple-git` | ^3.27.0 | Git operations | [Link](https://github.com/steveukx/git-js) |
| `zod` | ^3.24.1 | Runtime validation | [Link](https://zod.dev/) |

---

## 🎓 Learning Resources

### Understanding the Codebase

**Start here:**
1. Read `README.md` - Overview and features
2. Read `QUICKSTART.md` - Setup process
3. Read this file (you are here!) - Technical context
4. Review `src/handlers/issue-processor.ts` - Main flow
5. Explore services in `src/services/` - Individual components

**Key Concepts:**
- **Serverless Functions:** Vercel runs each API endpoint independently
- **Event-Driven Architecture:** Slack events trigger async pipeline
- **Queue-Based Processing:** Jobs processed sequentially with retry
- **Type Safety:** Zod validates runtime data, TypeScript validates compile-time

### How to Debug

1. **Check Logs**
   ```bash
   # Local: Terminal output from `npm run dev`
   # Production: `vercel logs --follow`
   ```

2. **Test Individual Services**
   ```typescript
   // Create a test file
   import { claudeAgentService } from './src/services/claude/agent.js';

   const result = await claudeAgentService.analyzeAndFix(
     "Fix the typo in README",
     { repoPath: '/path/to/repo', systemPrompt: '...' }
   );
   console.log(result);
   ```

3. **Inspect Slack Events**
   - Slack App Dashboard → Event Subscriptions → Request Log
   - Shows all webhook calls + responses

4. **Monitor Git Operations**
   ```bash
   # Check what branch the bot created
   git branch -a | grep fix/

   # View recent commits
   git log --oneline -5
   ```

---

## ⚠️ Critical Constraints

### Hard Requirements

1. **Slack Webhook Must Respond in <3 Seconds**
   - Slack retries if no response
   - Use async queue for long-running tasks
   - Return 200 OK immediately

2. **Complete File Contents Required**
   - Claude must return full file content, not diffs
   - Partial content will corrupt files
   - Enforce in system prompt

3. **Git Authentication**
   - Token must have `repo` scope
   - Use HTTPS URLs with embedded token
   - Never log or expose tokens

4. **Branch Naming Rules**
   - No spaces (use hyphens)
   - Lowercase only
   - Max 50 characters
   - Semantic prefix (fix/, feat/, etc.)

5. **Vercel Function Limits**
   - Max duration: 300 seconds (5 minutes)
   - Max payload: 4.5MB
   - Max response: 4.5MB
   - Design around these limits

### Performance Targets

- **Webhook Response:** <500ms (actual: ~100ms)
- **Total Pipeline:** <5 minutes (typical: 2-3 minutes)
- **Claude API Call:** <30 seconds (depends on complexity)
- **Git Operations:** <20 seconds (clone + commit + push)
- **PR Creation:** <5 seconds (GitHub API)

---

## 🔮 Future Considerations

### Scalability

**Current Limitations:**
- In-memory queue (lost on restart)
- No concurrency (one job at a time)
- No job persistence
- Single Slack workspace

**Scale Plan (v2):**
- Redis queue (persistent, distributed)
- Worker pools (parallel processing)
- PostgreSQL (job history, analytics)
- Multi-tenant database schema

### Business Model

**Potential Pricing (SaaS):**
- **Free Tier:** 5 fixes/month
- **Pro Tier:** $49/mo - 50 fixes/month
- **Enterprise:** $299/mo - Unlimited + approval workflows

**Revenue Streams:**
- Subscription fees
- Per-repo add-ons ($10/mo each)
- Priority processing ($20/mo)
- White-label licensing

### Competitive Analysis

**vs GitHub Copilot:**
- ✅ Works in Slack (team collaboration context)
- ✅ Full deployment pipeline
- ✅ Non-technical users can request fixes
- ❌ Not real-time in IDE

**vs Cursor AI:**
- ✅ No IDE required
- ✅ Automatic deployment
- ✅ Team-wide visibility
- ❌ Not interactive during development

**vs Manual Code Review:**
- ✅ 10-100x faster
- ✅ Available 24/7
- ✅ Consistent quality
- ❌ Requires review for production merge

---

## ✅ Success Metrics

### Technical KPIs

- **Uptime:** >99.5%
- **Success Rate:** >90% of jobs complete successfully
- **Average Time:** <5 minutes from Slack → PR
- **Error Rate:** <5% system errors

### Product KPIs

- **Time to Value:** <10 minutes setup
- **User Satisfaction:** NPS >50
- **Fix Accuracy:** >85% of fixes deployed without modification
- **Cost per Fix:** <$0.50 (Claude API costs)

### Business KPIs (v2)

- **MRR:** Monthly recurring revenue
- **Conversion Rate:** Free → Paid
- **Retention:** Monthly active users
- **CAC:** Customer acquisition cost
- **LTV:** Lifetime value

---

## 🆘 Emergency Procedures

### System Down

1. **Check Health Endpoint**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

2. **Review Vercel Logs**
   ```bash
   vercel logs --follow
   ```

3. **Verify Slack Webhook**
   - Slack App Dashboard → Event Subscriptions
   - Check for failed deliveries

4. **Rollback if Needed**
   ```bash
   # Revert to last known good commit
   git revert HEAD
   git push
   ```

### Rate Limits Exceeded

**Claude API:**
- Monitor usage at console.anthropic.com
- Implement backoff/retry logic
- Consider response caching (v2)

**GitHub API:**
- Default: 5,000 requests/hour
- Check headers: `X-RateLimit-Remaining`
- Add delay between operations if needed

**Slack API:**
- Tier 3: 50+ requests/minute
- Usually not an issue (low frequency)

### Data Loss Prevention

**Current State:**
- Jobs in queue: Lost on restart (in-memory)
- Git commits: Safe (in version control)
- Slack messages: Safe (in Slack history)

**Recovery:**
- User can re-post issue in Slack
- No permanent data loss (stateless design)

**v2 Improvements:**
- Persistent queue (Redis)
- Job history (PostgreSQL)
- Automatic retry on restart

---

## 📝 Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0.0 | 2025-10-05 | Initial MVP release | Claude + Matt Kilmer |
| | | - All 6 phases complete | |
| | | - Production-ready codebase | |
| | | - Comprehensive documentation | |

---

## 🙋 FAQ for AI Agents

**Q: Where should I start if asked to add a new feature?**
A: 1) Understand the feature, 2) Review `issue-processor.ts` to see where it fits, 3) Create a new service if needed, 4) Update types, 5) Test locally, 6) Update docs.

**Q: How do I test my changes?**
A: Run `npm run build && npm run type-check`, then `npm run dev` + ngrok, post a test message in Slack.

**Q: The build is failing. What should I check?**
A: 1) TypeScript errors (`npm run type-check`), 2) Missing imports, 3) Zod schema validation, 4) Check this file for constraints.

**Q: How do I add a new environment variable?**
A: 1) Add to `.env.example`, 2) Add to `src/config/index.ts` with Zod validation, 3) Update `claude.md` docs, 4) Update Vercel environment vars.

**Q: Can I change the Claude prompt?**
A: Yes, but test thoroughly! The prompt is in `src/services/claude/agent.ts` → `buildSystemPrompt()`. Ensure JSON format is preserved.

**Q: Should I add tests?**
A: Not required for MVP, but highly recommended for any new features. See "Testing Strategy" section above.

**Q: How do I debug Slack signature verification failures?**
A: Check: 1) `SLACK_SIGNING_SECRET` is correct, 2) Request body is exactly as received (don't parse before verifying), 3) Timestamp isn't too old.

**Q: What if Claude returns invalid JSON?**
A: The system has a fallback - it treats the entire response as "analysis" and continues. See `parseFixPlan()` in `claude/agent.ts`.

**Q: How do I handle long-running operations (>5 min)?**
A: Split into multiple Vercel functions or use a separate worker process. Current limit is 300s (5 minutes).

**Q: Can this work with private repositories?**
A: Yes! The `GITHUB_TOKEN` authenticates with private repos. Just ensure the token has access.

---

**Last Updated:** 2025-10-05
**Maintained By:** Matt Kilmer + Claude
**Contact:** https://github.com/MattKilmer/claude-slackbot/issues

---

*This document is living documentation. Update it whenever you make significant changes to the codebase.*
