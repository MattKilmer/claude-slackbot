import { IssueJob, JobResult, BranchOptions } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { slackService } from '../services/slack/client.js';
import { claudeAgentService } from '../services/claude/agent.js';
import { gitAutomationService } from '../services/git/automation.js';
import { githubAPIService } from '../services/git/github-api.js';
import { vercelDeploymentService } from '../services/deployment/vercel.js';
import { config } from '../config/index.js';

/**
 * Main issue processor - orchestrates the entire fix pipeline
 *
 * This is the core business logic that:
 * 1. Acknowledges the issue in Slack (with 👀 reaction)
 * 2. Posts initial status message
 * 3. Analyzes codebase with Claude
 * 4. Creates a new Git branch
 * 5. Commits changes
 * 6. Pushes to remote
 * 7. Creates a Pull Request
 * 8. Waits for Vercel deployment
 * 9. Reports back to Slack with PR + preview URL
 */
export async function processIssue(job: IssueJob): Promise<JobResult> {
  const { text, channel, threadTs, userId } = job;
  let statusMessageTs: string | undefined;
  let branchName: string | undefined;

  try {
    logger.info('📋 Processing issue', {
      jobId: job.id,
      preview: text.substring(0, 100),
    });

    // ============================================
    // STEP 1: Acknowledge in Slack
    // ============================================
    await slackService.addReaction(channel, threadTs, 'eyes');

    const statusMsg = await slackService.postMessage(
      channel,
      '🔧 *Analyzing issue...*\nClaude is reviewing your request and the codebase.',
      threadTs
    );
    statusMessageTs = statusMsg.ts;

    // ============================================
    // STEP 2: Initialize Git Repository
    // ============================================
    logger.info('📦 Initializing repository...');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      '📦 *Cloning repository...*\nSetting up local workspace.'
    );

    await gitAutomationService.initializeRepo();

    // ============================================
    // STEP 3: Analyze with Claude
    // ============================================
    logger.info('🤖 Running Claude analysis');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      '🤖 *Running Claude Agent...*\nAnalyzing codebase and generating fix...'
    );

    const fixResult = await claudeAgentService.analyzeAndFix(text, {
      systemPrompt: `You are a senior software engineer fixing issues in a production codebase.

Be precise, surgical, and thorough. Only change what needs to be changed.
Provide complete file contents, not diffs.
Maintain existing code style and conventions.
Test your logic mentally before responding.

This fix will be automatically deployed - make sure it's production-ready.`,
      repoPath: gitAutomationService.getRepoPath(),
      maxTokens: 8000,
    });

    if (!fixResult.success) {
      await slackService.updateMessage(
        channel,
        statusMessageTs,
        `❌ *Analysis Failed*\n\n${fixResult.error || 'Unknown error occurred'}\n\nPlease try rephrasing your request or providing more details about the issue.`
      );

      return {
        jobId: job.id,
        status: 'failed',
        error: fixResult.error,
      };
    }

    if (fixResult.filesChanged.length === 0) {
      await slackService.updateMessage(
        channel,
        statusMessageTs,
        `⚠️ *No Changes Generated*\n\nClaude analyzed the issue but didn't generate any file changes.\n\n**Analysis:**\n${fixResult.analysis}\n\nThis might mean:\n• The issue couldn't be fixed automatically\n• More information is needed\n• The issue might already be fixed`
      );

      return {
        jobId: job.id,
        status: 'completed',
        result: fixResult,
      };
    }

    // ============================================
    // STEP 4: Create Git Branch
    // ============================================
    logger.info('🌿 Creating git branch');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      `💾 *Creating branch...*\nGenerated ${fixResult.filesChanged.length} file change(s).`
    );

    // Determine branch type from issue text
    const branchType = determineBranchType(text);
    const branchOptions: BranchOptions = {
      type: branchType,
      description: text.substring(0, 50),
    };

    const branchResult = await gitAutomationService.createBranch(branchOptions);

    if (!branchResult.success || !branchResult.branchName) {
      await slackService.updateMessage(
        channel,
        statusMessageTs,
        `⚠️ *Git Branch Creation Failed*\n\n${branchResult.error}\n\nFix was generated but could not create branch.`
      );

      return {
        jobId: job.id,
        status: 'failed',
        result: fixResult,
        error: branchResult.error,
      };
    }

    branchName = branchResult.branchName;

    // ============================================
    // STEP 5: Commit Changes
    // ============================================
    logger.info('💾 Committing changes');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      `💾 *Committing changes...*\nBranch: \`${branchName}\``
    );

    const commitMessage = generateCommitMessage(text, fixResult.solution, fixResult.filesChanged);
    const commitResult = await gitAutomationService.commitChanges(
      commitMessage,
      fixResult.filesChanged
    );

    if (!commitResult.success) {
      await slackService.updateMessage(
        channel,
        statusMessageTs,
        `⚠️ *Git Commit Failed*\n\n${commitResult.error}\n\nFix was generated but could not be committed.`
      );

      return {
        jobId: job.id,
        status: 'failed',
        result: fixResult,
        error: commitResult.error,
      };
    }

    // ============================================
    // STEP 6: Push to Remote
    // ============================================
    logger.info('📤 Pushing to remote');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      `📤 *Pushing to GitHub...*\nBranch: \`${branchName}\`\nCommit: \`${commitResult.hash?.substring(0, 7)}\``
    );

    const pushSuccess = await gitAutomationService.pushBranch(branchName);

    if (!pushSuccess) {
      await slackService.updateMessage(
        channel,
        statusMessageTs,
        `⚠️ *Git Push Failed*\n\nChanges were committed locally but could not be pushed to GitHub.\n\nPlease check GitHub credentials and permissions.`
      );

      return {
        jobId: job.id,
        status: 'failed',
        result: fixResult,
        error: 'Failed to push to remote',
      };
    }

    // ============================================
    // STEP 7: Create Pull Request
    // ============================================
    logger.info('📝 Creating pull request');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      `📝 *Creating pull request...*\nBranch pushed successfully!`
    );

    const prTitle = generatePRTitle(text, branchType);
    const prBody = githubAPIService.formatPRDescription(
      fixResult.analysis,
      fixResult.solution,
      fixResult.filesChanged
    );

    const prResult = await githubAPIService.createPullRequest(
      branchName,
      prTitle,
      prBody
    );

    if (!prResult.success || !prResult.prUrl) {
      await slackService.updateMessage(
        channel,
        statusMessageTs,
        `⚠️ *PR Creation Failed*\n\n${prResult.error}\n\nChanges were pushed to branch \`${branchName}\` but PR could not be created.\n\nYou can create the PR manually.`
      );

      return {
        jobId: job.id,
        status: 'completed',
        result: fixResult,
        branchName,
        error: prResult.error,
      };
    }

    // Add automatic labels
    if (prResult.prNumber) {
      await githubAPIService.addLabels(prResult.prNumber, ['automated', 'claude-fix']);
    }

    // ============================================
    // STEP 8: Wait for Deployment
    // ============================================
    logger.info('🚀 Waiting for deployment');
    await slackService.updateMessage(
      channel,
      statusMessageTs,
      `🚀 *Deploying to preview...*\n\n✅ Pull request created!\n📝 PR: ${prResult.prUrl}\n\n⏳ Waiting for Vercel to deploy preview (this may take 2-5 minutes)...`
    );

    const deployment = await vercelDeploymentService.waitForDeployment(branchName, 5);

    // ============================================
    // STEP 9: Report Final Results
    // ============================================
    if (deployment.success && deployment.url) {
      const successMessage = `✅ *Fix Deployed Successfully!*

🔗 *Preview URL:* ${deployment.url}
📝 *Pull Request:* ${prResult.prUrl}
🌿 *Branch:* \`${branchName}\`
📌 *Commit:* \`${commitResult.hash?.substring(0, 7)}\`

---

### 📊 Analysis
${fixResult.analysis}

### 💡 Solution Applied
${fixResult.solution}

### 📂 Files Modified (${fixResult.filesChanged.length})
${fixResult.filesChanged.map((f) => `• \`${f}\``).join('\n')}

---

⚡ *Ready for testing!* Click the preview URL to see your changes live.
🔍 Review the PR and merge when ready.

_Requested by <@${userId}>_`;

      await slackService.updateMessage(channel, statusMessageTs, successMessage);
      await slackService.addReaction(channel, threadTs, 'white_check_mark');

      logger.complete('Issue processing completed successfully!', {
        jobId: job.id,
        prUrl: prResult.prUrl,
        previewUrl: deployment.url,
      });

      return {
        jobId: job.id,
        status: 'completed',
        branchName,
        prUrl: prResult.prUrl,
        previewUrl: deployment.url,
        result: fixResult,
        deployment,
      };
    } else {
      // Deployment failed or timed out
      const partialSuccessMessage = `⚠️ *Partial Success*

✅ Fix generated and PR created!
❌ Deployment preview may still be building

📝 *Pull Request:* ${prResult.prUrl}
🌿 *Branch:* \`${branchName}\`

---

### 💡 Changes Made
${fixResult.solution}

### 📂 Files Modified
${fixResult.filesChanged.map((f) => `• \`${f}\``).join('\n')}

---

🔍 *Next Steps:*
• Check the PR for the full diff
• Deployment preview may appear in the PR checks shortly
• Or manually deploy to test the changes

_Note: ${deployment.error || 'Deployment is taking longer than expected'}_`;

      await slackService.updateMessage(channel, statusMessageTs, partialSuccessMessage);
      await slackService.addReaction(channel, threadTs, 'warning');

      return {
        jobId: job.id,
        status: 'completed',
        branchName,
        prUrl: prResult.prUrl,
        result: fixResult,
        deployment,
      };
    }
  } catch (error) {
    logger.error('💥 Critical error in issue processing', {
      jobId: job.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Try to update status message if we have one
    if (statusMessageTs) {
      try {
        await slackService.updateMessage(
          channel,
          statusMessageTs,
          `❌ *System Error*\n\nAn unexpected error occurred:\n\`\`\`\n${error instanceof Error ? error.message : String(error)}\n\`\`\`\n\nPlease try again or contact support if the issue persists.${branchName ? `\n\n_Note: Branch \`${branchName}\` may have been created._` : ''}`
        );
      } catch {
        // If we can't update, post a new message
        await slackService.postMessage(
          channel,
          `❌ Critical error: ${error instanceof Error ? error.message : String(error)}`,
          threadTs
        );
      }
    }

    return {
      jobId: job.id,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Determine branch type from issue text
 */
function determineBranchType(text: string): 'fix' | 'feat' | 'refactor' | 'chore' {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('bug') || lowerText.includes('fix') || lowerText.includes('error')) {
    return 'fix';
  }

  if (lowerText.includes('feature') || lowerText.includes('add') || lowerText.includes('implement')) {
    return 'feat';
  }

  if (lowerText.includes('refactor') || lowerText.includes('improve') || lowerText.includes('optimize')) {
    return 'refactor';
  }

  return 'chore';
}

/**
 * Generate commit message
 */
function generateCommitMessage(
  issueText: string,
  solution: string,
  filesChanged: string[]
): string {
  const preview = issueText.substring(0, 50) + (issueText.length > 50 ? '...' : '');

  return `🤖 Auto-fix: ${preview}

${solution}

Files changed:
${filesChanged.map((f) => `- ${f}`).join('\n')}

---
🤖 Generated by Claude AutoFix Bot
Co-authored-by: Claude <noreply@anthropic.com>`;
}

/**
 * Generate PR title
 */
function generatePRTitle(issueText: string, type: string): string {
  const prefix = type === 'fix' ? '🐛 Fix:' : type === 'feat' ? '✨ Feature:' : '♻️ Refactor:';
  const title = issueText.substring(0, 70);
  return `${prefix} ${title}${issueText.length > 70 ? '...' : ''}`;
}
