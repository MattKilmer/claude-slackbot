import { simpleGit, SimpleGit, SimpleGitOptions } from 'simple-git';
import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import { GitBranchResult, GitCommitResult, BranchOptions } from '../../types/index.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

/**
 * Git automation service for branch creation, commits, and pushes
 *
 * This service handles all Git operations on the target repository:
 * 1. Clone/pull the repository
 * 2. Create feature branches
 * 3. Commit changes with descriptive messages
 * 4. Push to remote (GitHub)
 */
class GitAutomationService {
  private git: SimpleGit | null = null;
  private repoPath: string;
  private targetRepoUrl: string;
  private baseBranch: string;

  constructor() {
    this.targetRepoUrl = config.github.targetRepoUrl;
    this.baseBranch = config.github.baseBranch;

    // Use configured path or create temp directory
    this.repoPath =
      config.github.localRepoPath ||
      path.join(os.tmpdir(), 'claude-autofix-repos', this.getRepoName());
  }

  /**
   * Extract repository name from URL
   */
  private getRepoName(): string {
    const match = this.targetRepoUrl.match(/\/([^\/]+?)(?:\.git)?$/);
    return match ? match[1] : 'repo';
  }

  /**
   * Initialize git client for the repository
   * Clones if doesn't exist, pulls latest if exists
   */
  async initializeRepo(): Promise<void> {
    try {
      logger.info('🔧 Initializing repository', {
        repoUrl: this.targetRepoUrl,
        localPath: this.repoPath,
      });

      // Check if repo already exists locally
      const exists = await this.checkRepoExists();

      if (!exists) {
        // Clone the repository
        logger.info('📦 Cloning repository...');
        await fs.mkdir(path.dirname(this.repoPath), { recursive: true });

        // Clone with authentication
        const authUrl = this.getAuthenticatedUrl();
        await simpleGit().clone(authUrl, this.repoPath);

        logger.success('Repository cloned successfully');
      } else {
        logger.debug('Repository already exists, pulling latest changes');
      }

      // Initialize git client
      const options: Partial<SimpleGitOptions> = {
        baseDir: this.repoPath,
        binary: 'git',
        maxConcurrentProcesses: 1,
      };
      this.git = simpleGit(options);

      // Ensure we're on base branch and up to date
      await this.git.checkout(this.baseBranch);
      await this.git.pull('origin', this.baseBranch);

      logger.success('Repository initialized and up to date');
    } catch (error) {
      logger.error('Failed to initialize repository', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Check if repository exists locally
   */
  private async checkRepoExists(): Promise<boolean> {
    try {
      await fs.access(path.join(this.repoPath, '.git'));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get authenticated URL for git operations
   */
  private getAuthenticatedUrl(): string {
    const username = config.github.username;
    const token = config.github.token;

    // Convert https://github.com/owner/repo.git
    // to https://username:token@github.com/owner/repo.git
    return this.targetRepoUrl.replace(
      'https://',
      `https://${username}:${token}@`
    );
  }

  /**
   * Create a new branch with a descriptive name
   *
   * Branch naming convention:
   * - fix/description-of-fix
   * - feat/description-of-feature
   * - refactor/description-of-refactor
   */
  async createBranch(options: BranchOptions): Promise<GitBranchResult> {
    if (!this.git) {
      throw new Error('Git not initialized. Call initializeRepo() first.');
    }

    try {
      // Generate branch name
      const branchName = this.generateBranchName(options);

      logger.info('🌿 Creating new branch', { branchName });

      // Ensure we're on base branch first
      await this.git.checkout(options.baseBranch || this.baseBranch);

      // Pull latest changes
      await this.git.pull('origin', options.baseBranch || this.baseBranch);

      // Delete branch if it already exists (cleanup from previous runs)
      try {
        await this.git.deleteLocalBranch(branchName, true);
        logger.debug('Deleted existing local branch', { branchName });
      } catch {
        // Branch doesn't exist - that's fine
      }

      // Create and checkout new branch
      await this.git.checkoutLocalBranch(branchName);

      logger.success('Branch created successfully', { branchName });

      return {
        success: true,
        branchName,
      };
    } catch (error) {
      logger.error('Failed to create branch', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generate a branch name from description
   */
  private generateBranchName(options: BranchOptions): string {
    const prefix = options.type;
    // Sanitize description: lowercase, replace spaces/special chars with hyphens
    const sanitized = options.description
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50); // Max 50 chars

    return `${prefix}/${sanitized}`;
  }

  /**
   * Commit changes with a descriptive message
   */
  async commitChanges(
    message: string,
    files: string[] = []
  ): Promise<GitCommitResult> {
    if (!this.git) {
      throw new Error('Git not initialized. Call initializeRepo() first.');
    }

    try {
      logger.info('💾 Committing changes', {
        files: files.length,
        messagePreview: message.substring(0, 50),
      });

      // Stage files
      if (files.length > 0) {
        logger.debug('Staging specific files', { count: files.length });
        await this.git.add(files);
      } else {
        logger.debug('Staging all changes');
        await this.git.add('.');
      }

      // Check if there are changes to commit
      const status = await this.git.status();
      if (status.files.length === 0) {
        logger.info('No changes to commit');
        const current = await this.getCurrentBranch();
        return {
          success: true,
          branch: current,
        };
      }

      // Commit
      const commitResult = await this.git.commit(message);
      const hash = commitResult.commit;

      logger.success('Changes committed', {
        hash: hash.substring(0, 7),
        files: status.files.length,
      });

      return {
        success: true,
        hash,
        branch: await this.getCurrentBranch(),
      };
    } catch (error) {
      logger.error('Failed to commit changes', {
        error: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Push branch to remote
   */
  async pushBranch(branchName: string): Promise<boolean> {
    if (!this.git) {
      throw new Error('Git not initialized. Call initializeRepo() first.');
    }

    try {
      logger.info('📤 Pushing branch to remote', { branchName });

      // Configure authentication for push
      await this.git.addConfig('credential.helper', 'store');

      // Push with upstream tracking
      await this.git.push(['--set-upstream', 'origin', branchName]);

      logger.success('Branch pushed successfully', { branchName });

      return true;
    } catch (error) {
      logger.error('Failed to push branch', {
        error: error instanceof Error ? error.message : String(error),
        branchName,
      });
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch(): Promise<string> {
    if (!this.git) {
      throw new Error('Git not initialized. Call initializeRepo() first.');
    }

    const status = await this.git.status();
    return status.current || 'unknown';
  }

  /**
   * Get repository path
   */
  getRepoPath(): string {
    return this.repoPath;
  }

  /**
   * Get repository status
   */
  async getStatus() {
    if (!this.git) {
      throw new Error('Git not initialized. Call initializeRepo() first.');
    }
    return this.git.status();
  }
}

// Export singleton instance
export const gitAutomationService = new GitAutomationService();
