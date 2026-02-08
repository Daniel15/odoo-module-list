import {Octokit} from 'octokit';

const ORG = 'OCA';
const VERSION_BRANCH_RE = /^v?\d+\.0$/;

let octokit: Octokit;

export function initOctokit(token: string) {
  octokit = new Octokit({auth: token});
}

/**
 * List all non-archived, non-fork repos in the OCA org.
 */
export async function listRepos(): Promise<string[]> {
  const repos: string[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const {data} = await octokit.rest.repos.listForOrg({
      org: ORG,
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
export async function getVersionBranches(repo: string): Promise<{name: string; sha: string}[]> {
  const branches: {name: string; sha: string}[] = [];
  let page = 1;
  let hasMore = true;
  while (hasMore) {
    const {data} = await octokit.rest.repos.listBranches({
      owner: ORG,
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
export async function getModulesInBranch(repo: string, branchSha: string): Promise<string[]> {
  const {data} = await octokit.rest.git.getTree({
    owner: ORG,
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
