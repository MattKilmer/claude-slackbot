import { z } from 'zod';

// ============================================
// SLACK EVENT TYPES
// ============================================

export const SlackEventSchema = z.object({
  type: z.literal('event_callback'),
  team_id: z.string(),
  event: z.object({
    type: z.string(),
    channel: z.string(),
    user: z.string(),
    text: z.string(),
    ts: z.string(),
    thread_ts: z.string().optional(),
    event_ts: z.string(),
  }),
});

export const SlackVerificationSchema = z.object({
  type: z.literal('url_verification'),
  token: z.string(),
  challenge: z.string(),
});

export type SlackEvent = z.infer<typeof SlackEventSchema>;
export type SlackVerification = z.infer<typeof SlackVerificationSchema>;

// ============================================
// CLAUDE AGENT TYPES
// ============================================

export interface ClaudeAgentConfig {
  systemPrompt: string;
  repoPath: string;
  allowedTools?: string[];
  maxTokens?: number;
}

export interface CodeFix {
  path: string;
  description: string;
  newContent?: string;
  originalContent?: string;
}

export interface FixResult {
  success: boolean;
  analysis: string;
  solution: string;
  filesChanged: string[];
  fixes: CodeFix[];
  error?: string;
}

// ============================================
// GIT & GITHUB TYPES
// ============================================

export interface GitBranchResult {
  success: boolean;
  branchName?: string;
  error?: string;
}

export interface GitCommitResult {
  success: boolean;
  hash?: string;
  branch?: string;
  error?: string;
}

export interface GitHubPRResult {
  success: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

// ============================================
// DEPLOYMENT TYPES
// ============================================

export interface DeploymentResult {
  success: boolean;
  url?: string;
  deploymentId?: string;
  status?: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  error?: string;
}

export interface VercelDeployment {
  id: string;
  url: string;
  readyState: 'READY' | 'ERROR' | 'BUILDING' | 'QUEUED' | 'CANCELED';
  createdAt: number;
  meta?: {
    githubCommitRef?: string;
  };
  projectId?: string;
}

// ============================================
// JOB QUEUE TYPES
// ============================================

export interface IssueJob {
  id: string;
  text: string;
  channel: string;
  threadTs: string;
  userId: string;
  timestamp: Date;
  retryCount?: number;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface JobResult {
  jobId: string;
  status: JobStatus;
  branchName?: string;
  prUrl?: string;
  previewUrl?: string;
  result?: FixResult;
  deployment?: DeploymentResult;
  error?: string;
}

// ============================================
// CONFIG TYPES
// ============================================

export interface Config {
  slack: {
    botToken: string;
    signingSecret: string;
    channelId: string;
  };
  claude: {
    apiKey: string;
  };
  github: {
    token: string;
    username: string;
    targetRepoUrl: string;
    baseBranch: string;
    localRepoPath?: string;
  };
  deployment: {
    vercelToken?: string;
    vercelProjectId?: string;
    vercelOrgId?: string;
  };
  nodeEnv: 'development' | 'production' | 'test';
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  featureFlags: string[];
}

// ============================================
// UTILITY TYPES
// ============================================

export interface LogMetadata {
  [key: string]: any;
}

export type BranchNamingStrategy = 'fix' | 'feat' | 'refactor' | 'chore';

export interface BranchOptions {
  type: BranchNamingStrategy;
  description: string;
  baseBranch?: string;
}
