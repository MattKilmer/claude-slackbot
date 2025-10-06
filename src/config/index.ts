import { z } from 'zod';
import dotenv from 'dotenv';
import { Config } from '../types/index.js';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Validation schema with helpful error messages
const ConfigSchema = z.object({
  slack: z.object({
    botToken: z.string().startsWith('xoxb-', {
      message: 'Slack bot token must start with xoxb-. Get it from OAuth & Permissions.',
    }),
    signingSecret: z.string().min(1, {
      message: 'Slack signing secret is required. Get it from Basic Information.',
    }),
    channelId: z.string().startsWith('C', {
      message: 'Slack channel ID must start with C. Right-click channel → View details.',
    }),
  }),
  claude: z.object({
    apiKey: z.string().startsWith('sk-ant-', {
      message: 'Claude API key must start with sk-ant-. Get it from console.anthropic.com.',
    }),
  }),
  github: z.object({
    token: z.string().startsWith('ghp_', {
      message: 'GitHub token must start with ghp_. Generate at github.com/settings/tokens.',
    }),
    username: z.string().min(1, {
      message: 'GitHub username is required.',
    }),
    targetRepoUrl: z.string().url({
      message: 'Target repo URL must be a valid URL (e.g., https://github.com/owner/repo.git)',
    }),
    baseBranch: z.string().default('main'),
    localRepoPath: z.string().optional(),
  }),
  deployment: z.object({
    vercelToken: z.string().optional(),
    vercelProjectId: z.string().optional(),
    vercelOrgId: z.string().optional(),
  }),
  nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  featureFlags: z.array(z.string()).default([]),
});

function loadConfig(): Config {
  const rawConfig = {
    slack: {
      botToken: process.env.SLACK_BOT_TOKEN || '',
      signingSecret: process.env.SLACK_SIGNING_SECRET || '',
      channelId: process.env.SLACK_CHANNEL_ID || '',
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    },
    github: {
      token: process.env.GITHUB_TOKEN || '',
      username: process.env.GITHUB_USERNAME || '',
      targetRepoUrl: process.env.TARGET_REPO_URL || '',
      baseBranch: process.env.BASE_BRANCH || 'main',
      localRepoPath: process.env.LOCAL_REPO_PATH,
    },
    deployment: {
      vercelToken: process.env.VERCEL_TOKEN,
      vercelProjectId: process.env.VERCEL_PROJECT_ID,
      vercelOrgId: process.env.VERCEL_ORG_ID,
    },
    nodeEnv: (process.env.NODE_ENV as any) || 'development',
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    featureFlags: process.env.FEATURE_FLAGS
      ? process.env.FEATURE_FLAGS.split(',').map((f) => f.trim())
      : [],
  };

  try {
    return ConfigSchema.parse(rawConfig);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('\n❌ Configuration validation failed:\n');
      error.errors.forEach((err) => {
        console.error(`  ❌ ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\n💡 Check your .env.local file and ensure all required variables are set.\n');
      throw new Error('Invalid configuration. See errors above.');
    }
    throw error;
  }
}

// Export singleton config instance
export const config = loadConfig();

// Helper to check if a feature flag is enabled
export function isFeatureEnabled(flag: string): boolean {
  return config.featureFlags.includes(flag);
}
