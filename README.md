# 🤖 Claude AutoFix Bot

> Automated code fixing via Slack → Claude → Git PR → Deploy

Transform your Slack channel into an AI-powered development assistant. Report a bug or request a feature, and Claude will analyze your codebase, generate a fix, create a pull request, deploy a preview, and report back—all automatically.

## ✨ Features

- 🎯 **Slack-Native**: Report issues directly in your team's Slack channel
- 🤖 **Claude-Powered**: Uses Claude 3.7 Sonnet for intelligent code analysis
- 📝 **Auto-PR Creation**: Creates properly formatted pull requests with descriptive branches
- 🚀 **Instant Previews**: Vercel auto-deploys PR previews for immediate testing
- 💬 **Rich Notifications**: Beautiful Slack updates throughout the process
- 🔄 **Full Audit Trail**: Every change is tracked via Git history

## 🎬 How It Works

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User posts in Slack: "Fix the navigation bar mobile bug"    │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. Bot acknowledges with 👀 reaction                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. Claude analyzes codebase and generates fix                  │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. Creates new branch: fix/navigation-bar-mobile                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. Commits changes and pushes to GitHub                        │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. Creates Pull Request with detailed description              │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. Vercel auto-deploys preview from PR                         │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│ 8. Bot posts PR link + preview URL to Slack thread ✅          │
└─────────────────────────────────────────────────────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- **Node.js 20+** installed
- **Slack workspace** with admin access
- **GitHub account** with repo access
- **Vercel account** for deployments
- **Anthropic API key** for Claude

### 1. Clone & Install

```bash
git clone https://github.com/MattKilmer/claude-slackbot.git
cd claude-slackbot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local` and add your credentials (see [QUICKSTART.md](QUICKSTART.md) for detailed setup guide):

- `SLACK_BOT_TOKEN` - Your Slack bot token
- `SLACK_SIGNING_SECRET` - Slack signing secret
- `SLACK_CHANNEL_ID` - Channel to monitor
- `ANTHROPIC_API_KEY` - Your Claude API key
- `GITHUB_TOKEN` - GitHub personal access token
- `TARGET_REPO_URL` - Repository to fix (e.g., https://github.com/your-org/your-repo.git)
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### 3. Run Locally

```bash
npm run dev
```

In another terminal, expose your local server:

```bash
npx ngrok http 3000
```

### 4. Configure Slack

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Create a new app
3. Enable **Event Subscriptions**
4. Set Request URL to: `https://your-ngrok-url.ngrok.io/api/slack-events`
5. Subscribe to bot events: `message.channels`
6. Install app to your workspace

### 5. Test It!

Post a message in your Slack channel:

```
Fix the bug in the navbar where the menu doesn't close on mobile
```

The bot will:
- ✅ React with 👀
- ✅ Analyze with Claude
- ✅ Create a new branch
- ✅ Commit the fix
- ✅ Create a PR
- ✅ Deploy preview
- ✅ Post results back to thread

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Step-by-step setup guide with API key instructions
- **[claude.md](claude.md)** - Comprehensive technical context for developers and AI agents
- **[MASTER-PLAN.md](MASTER-PLAN.md)** - Product roadmap and v2 architecture plans

## 🏗️ Project Structure

```
claude-slackbot/
├── api/                    # Vercel serverless functions
│   ├── slack-events.ts     # Slack webhook handler
│   └── health.ts           # Health check endpoint
├── src/
│   ├── config/             # Configuration management
│   ├── types/              # TypeScript type definitions
│   ├── services/           # Core services
│   │   ├── slack/          # Slack API integration
│   │   ├── claude/         # Claude Agent SDK
│   │   ├── git/            # Git automation + GitHub API
│   │   └── deployment/     # Vercel deployment
│   ├── handlers/           # Business logic
│   └── utils/              # Shared utilities
├── QUICKSTART.md           # Setup guide
├── claude.md               # Technical context
└── MASTER-PLAN.md          # Product roadmap
```

## 🛠️ Technology Stack

- **TypeScript** - Type-safe development
- **Node.js 20** - Runtime
- **Vercel** - Hosting & serverless functions
- **Claude 3.7 Sonnet** - AI code analysis
- **Slack API** - Team communication
- **GitHub API** - PR automation
- **simple-git** - Git operations
- **Zod** - Schema validation

## 🧪 Development

```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Run tests
npm test

# Build for production
npm run build
```

## 🚀 Deployment

```bash
# Deploy to Vercel production
vercel --prod
```

Don't forget to:
1. Set environment variables in Vercel dashboard
2. Update Slack Event Subscriptions URL to production URL

## 🔒 Security

- ✅ Slack signature verification on all webhooks
- ✅ Environment variables never committed
- ✅ GitHub tokens with minimal required scopes
- ✅ All operations logged for audit trail
- ✅ Rate limiting via job queue

## 📊 Roadmap

### v1.0 (Current - MVP)
- ✅ Slack integration
- ✅ Claude code analysis
- ✅ Automatic PR creation
- ✅ Vercel preview deployments
- ✅ Rich Slack notifications

### v2.0 (Planned)
- [ ] Multi-repository support
- [ ] Custom prompt templates
- [ ] Approval workflows
- [ ] Usage analytics dashboard
- [ ] Rollback capability
- [ ] Multiple deployment platforms (Netlify, Railway)

### v3.0 (Future)
- [ ] SaaS multi-tenancy
- [ ] Stripe billing integration
- [ ] Enterprise features (SSO, audit logs)
- [ ] Slack app directory listing

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request on GitHub.

## 🙏 Acknowledgments

- Built with [Claude](https://anthropic.com) by Anthropic
- Powered by [Vercel](https://vercel.com)
- Inspired by the future of AI-assisted development

## 📧 Support

- 🐛 [Report a Bug](https://github.com/MattKilmer/claude-slackbot/issues)
- 💡 [Request a Feature](https://github.com/MattKilmer/claude-slackbot/issues)
- 📖 [Read the Docs](QUICKSTART.md)

---

**Made with ❤️ by [Matt Kilmer](https://github.com/MattKilmer)**

*Transforming how teams ship code, one Slack message at a time.*
