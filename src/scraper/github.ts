import {Octokit} from 'octokit';
import type {MigrationPR} from '../schemas.ts';

const VERSION_BRANCH_RE = /^v?\d+\.0$/;
const VERSION_RE = /\b(\d+\.0)\b/;
const MODULE_NAME_RE = /\[MIG\]\s*(\w+)/i;

let octokit: Octokit;

export function initOctokit(token: string) {
  octokit = new Octokit({auth: token});
}

/**
 * List all non-archived, non-fork repos in an org.
 */
export async function listRepos(org: string): Promise<string[]> {
  const repos: string[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const {data} = await octokit.rest.repos.listForOrg({
      org,
      type: 'public',
      per_page: 100,
      page,
    });
    if (data.length === 0) {
      hasMore = false;
    }
    for (const repo of data) {
      if (!repo.archived && !repo.fork) {
        repos.push(repo.name);
      }
    }
    page++;
  }
  repos.sort();
  return repos;
}

/**
 * Get version branches (matching vNN.0 pattern) for a repo.
 */
export async function getVersionBranches(
  owner: string,
  repo: string,
): Promise<{name: string; sha: string}[]> {
  const branches: {name: string; sha: string}[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const {data} = await octokit.rest.repos.listBranches({
      owner,
      repo,
      per_page: 100,
      page,
    });
    if (data.length === 0) {
      hasMore = false;
    }
    for (const branch of data) {
      if (VERSION_BRANCH_RE.test(branch.name)) {
        branches.push({name: branch.name, sha: branch.commit.sha});
      }
    }
    page++;
  }
  return branches;
}

/**
 * Get the recursive file tree for a branch and return module directory names
 * (directories containing __manifest__.py at depth 1).
 */
export async function getModulesInBranch(
  owner: string,
  repo: string,
  branchSha: string,
): Promise<string[]> {
  const {data} = await octokit.rest.git.getTree({
    owner,
    repo,
    tree_sha: branchSha,
    recursive: '1',
  });

  const modules: string[] = [];
  for (const item of data.tree) {
    if (item.type === 'blob' && item.path) {
      const parts = item.path.split('/');
      const moduleName = parts[0];
      if (parts.length === 2 && parts[1] === '__manifest__.py' && moduleName) {
        modules.push(moduleName);
      }
    }
  }
  return modules.sort();
}

export interface ParsedMigrationPR {
  moduleName: string;
  version: string;
  pr: MigrationPR;
}

/**
 * Get open migration PRs for a repo.
 * Looks for PRs with "MIG" in the title and extracts version/module info.
 */
export async function getMigrationPRs(
  owner: string,
  repo: string,
): Promise<ParsedMigrationPR[]> {
  const prs: ParsedMigrationPR[] = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const {data} = await octokit.rest.pulls.list({
      owner,
      repo,
      state: 'open',
      per_page: 100,
      page,
    });

    if (data.length === 0) {
      hasMore = false;
    }

    for (const pr of data) {
      if (!pr.title.toUpperCase().includes('MIG')) {
        continue;
      }

      const versionMatch = VERSION_RE.exec(pr.title);
      const moduleMatch = MODULE_NAME_RE.exec(pr.title);

      if (!versionMatch || !moduleMatch) {
        continue;
      }

      prs.push({
        moduleName: moduleMatch[1],
        version: versionMatch[1],
        pr: {
          title: pr.title,
          url: pr.html_url,
          createdAt: Math.floor(new Date(pr.created_at).getTime() / 1000),
          updatedAt: Math.floor(new Date(pr.updated_at).getTime() / 1000),
        },
      });
    }

    page++;
  }

  return prs;
}

/**
 * Check remaining rate limit and sleep if needed.
 */
export async function checkRateLimit(): Promise<void> {
  const {data} = await octokit.rest.rateLimit.get();
  const remaining = data.resources.core.remaining;
  const resetAt = data.resources.core.reset * 1000;

  if (remaining < 50) {
    const waitMs = resetAt - Date.now() + 1000;
    if (waitMs > 0) {
      console.error(
        `Rate limit low (${String(remaining)} remaining). Waiting ${String(Math.ceil(waitMs / 1000))}s...`,
      );
      await new Promise(resolve => setTimeout(resolve, waitMs));
    }
  }
}
