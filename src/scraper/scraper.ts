import {execSync} from 'node:child_process';
import {mkdir, readdir, unlink, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import type {ModuleInfo} from '../schemas.ts';

import {
  checkRateLimit,
  getMigrationPRs,
  getModulesInBranch,
  getVersionBranches,
  initOctokit,
  listRepos,
  type ParsedMigrationPR,
} from './github.ts';
import {getModuleManifest} from './manifest.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, '..', '..', 'data');

const CONCURRENCY = 50;
const MS_PER_SEC = 1000;

/**
 * Configuration for sources to scrape.
 */
interface ScraperConfig {
  /** Additional individual repos to scrape (owner/repo format) */
  additionalRepos: string[];
  /** GitHub organizations to scrape all repos from */
  orgs: string[];
}

const CONFIG: ScraperConfig = {
  additionalRepos: ['Daniel15/odoo-modules', 'apexive/odoo-llm'],
  orgs: ['OCA'],
};

interface RepoTask {
  owner: string;
  repo: string;
}

function getGhToken(): string {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  try {
    return execSync('gh auth token', {encoding: 'utf-8'}).trim();
  } catch {
    console.error(
      'Failed to get GitHub token. Either set GITHUB_TOKEN or run `gh auth login`.',
    );
    process.exit(1);
  }
}

async function main() {
  const token = getGhToken();
  initOctokit(token);

  await mkdir(OUTPUT_DIR, {recursive: true});

  const tasks: RepoTask[] = [];

  // Collect repos from all configured orgs
  for (const org of CONFIG.orgs) {
    console.error(`Listing repos for ${org}...`);
    const repos = await listRepos(org);
    console.error(`Found ${String(repos.length)} repos in ${org}`);
    for (const repo of repos) {
      tasks.push({owner: org, repo});
    }
  }

  // Add additional individual repos
  for (const fullRepo of CONFIG.additionalRepos) {
    const [owner, repo] = fullRepo.split('/');
    if (owner && repo) {
      tasks.push({owner, repo});
    } else {
      console.error(`Invalid repo format: ${fullRepo} (expected owner/repo)`);
    }
  }

  console.error(`Total: ${String(tasks.length)} repos to process`);

  let processed = 0;
  let moduleIDs = new Set<string>();
  await runWithConcurrency(tasks, CONCURRENCY, async task => {
    processed++;
    console.error(
      `[${String(processed)}/${String(tasks.length)}] ${task.owner}/${task.repo}`,
    );

    try {
      const repoModuleIDs = await processRepo(task);
      moduleIDs = moduleIDs.union(repoModuleIDs);
    } catch (err: unknown) {
      console.error(
        `  Error processing ${task.owner}/${task.repo}: ${String(err)}`,
      );
    }

    // Periodically check rate limit
    if (processed % 10 === 0) {
      await checkRateLimit();
    }
  });

  // Delete modules that no longer exist
  const dataFiles = await readdir(OUTPUT_DIR);
  for (const file of dataFiles) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const moduleID = file.replace(/\.json$/, '');
    if (!moduleIDs.has(moduleID)) {
      console.error(`Deleting data for module that no longer exists: ${file}`);
      await unlink(join(OUTPUT_DIR, file));
    }
  }

  console.error('Done!');
}

/**
 * Process the modules in a single repo.
 *
 * @returns A set of module IDs that were found in the repo.
 */
async function processRepo(task: RepoTask): Promise<ReadonlySet<string>> {
  const {owner, repo} = task;

  const branches = await getVersionBranches(owner, repo);
  if (branches.length === 0) {
    console.error(`  Skipping ${owner}/${repo} (no version branches)`);
    return new Set();
  }

  console.error(
    `  Processing ${owner}/${repo}: ${String(branches.length)} branches (${branches.map(b => b.name).join(', ')})`,
  );

  const moduleInfo = new Map<string, ModuleInfo>();

  function getModuleInfo(mod: string): ModuleInfo {
    // TODO: Use getOrInsert here, after upgrading TypeScript
    let thisModuleInfo = moduleInfo.get(mod);
    if (thisModuleInfo == null) {
      thisModuleInfo = {
        generatedAt: Math.floor(Date.now() / MS_PER_SEC),
        generatedAtReadable: new Date().toISOString(),
        id: mod,
        repo: `${owner}/${repo}`,
        versions: {},
      };
      moduleInfo.set(mod, thisModuleInfo);
    }
    return thisModuleInfo;
  }

  for (const branch of branches) {
    let modules: string[];
    try {
      modules = await getModulesInBranch(owner, repo, branch.sha);
    } catch (err: unknown) {
      console.error(
        `    Error getting tree for ${owner}/${repo}@${branch.name}: ${String(err)}`,
      );
      continue;
    }

    if (modules.length === 0) {
      continue;
    }

    console.error(
      `    ${owner}/${repo} ${branch.name}: ${String(modules.length)} modules`,
    );

    for (const mod of modules) {
      const manifest = await getModuleManifest(owner, repo, branch.name, mod);
      if (!manifest) {
        continue;
      }

      getModuleInfo(mod).versions[branch.name] = {
        ...manifest,
        repositoryURL: `https://github.com/${owner}/${repo}/tree/${branch.name}/${mod}`,
        websiteURL: manifest.website,
      };
    }
  }

  // Fetch open migration PRs
  let migrationPRs: ParsedMigrationPR[];
  try {
    migrationPRs = await getMigrationPRs(owner, repo);
  } catch (err: unknown) {
    console.error(
      `    Error fetching migration PRs for ${owner}/${repo}: ${String(err)}`,
    );
    migrationPRs = [];
  }

  if (migrationPRs.length > 0) {
    console.error(
      `    Found ${String(migrationPRs.length)} open migration PRs`,
    );
    for (const migrationPR of migrationPRs) {
      const mod = migrationPR.moduleName;
      const ver = migrationPR.version;

      // Ignore migration PRs if we don't know about the module name
      const thisModuleInfo = moduleInfo.get(mod);
      if (!thisModuleInfo) {
        console.error(
          `    Ignoring migration PR for unknown module ${mod} ${ver}`,
        );
        continue;
      }

      // Only add migration PR if there's no existing manifest for this version
      const hasExistingVersion = ver in (moduleInfo.get(mod)?.versions ?? {});
      if (!hasExistingVersion) {
        thisModuleInfo.versions[ver] = {migrationPR: migrationPR.pr};
      }
    }
  }

  if (moduleInfo.size > 0) {
    await Promise.allSettled(
      moduleInfo.values().map(async module => {
        const outputPath = join(OUTPUT_DIR, module.id + '.json');
        await writeFile(outputPath, JSON.stringify(module, null, 2) + '\n');
      }),
    );
    console.error(
      `  Wrote ${String(moduleInfo.size)} modules for ${owner}/${repo}`,
    );
  } else {
    console.error(`  No modules found in ${owner}/${repo}`);
  }

  return new Set(moduleInfo.keys());
}

/**
 * Run async tasks with a concurrency limit.
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const workers = Array.from(
    {length: Math.min(limit, items.length)},
    async () => {
      while (index < items.length) {
        const current = index++;
        const item = items[current];
        if (item !== undefined) {
          await fn(item);
        }
      }
    },
  );
  await Promise.all(workers);
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
