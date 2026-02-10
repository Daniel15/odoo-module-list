import {execSync} from 'node:child_process';
import {mkdir, writeFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {
  initOctokit,
  listRepos,
  getVersionBranches,
  getModulesInBranch,
  getMigrationPRs,
  checkRateLimit,
  type ParsedMigrationPR,
} from './github.ts';
import {getModuleManifest} from './manifest.ts';
import type {RepoOutput} from '../schemas.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const OUTPUT_DIR = join(__dirname, '..', '..', 'data');

const CONCURRENCY = 50;

function getGhToken(): string {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  try {
    return execSync('gh auth token', {encoding: 'utf-8'}).trim();
  } catch {
    console.error('Failed to get GitHub token. Either set GITHUB_TOKEN or run `gh auth login`.');
    process.exit(1);
  }
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
  const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
    while (index < items.length) {
      const current = index++;
      const item = items[current];
      if (item !== undefined) {
        await fn(item);
      }
    }
  });
  await Promise.all(workers);
}

async function processRepo(repo: string): Promise<void> {
  const outputPath = join(OUTPUT_DIR, `${repo}.json`);
  const branches = await getVersionBranches(repo);
  if (branches.length === 0) {
    console.error(`  Skipping ${repo} (no version branches)`);
    return;
  }

  console.error(
    `  Processing ${repo}: ${String(branches.length)} branches (${branches.map(b => b.name).join(', ')})`,
  );

  const output: RepoOutput = {
    repo,
    url: `https://github.com/OCA/${repo}`,
    modules: {},
  };

  for (const branch of branches) {
    let modules: string[];
    try {
      modules = await getModulesInBranch(repo, branch.sha);
    } catch (err: unknown) {
      console.error(`    Error getting tree for ${repo}@${branch.name}: ${String(err)}`);
      continue;
    }

    if (modules.length === 0) {
      continue;
    }

    console.error(`    ${branch.name}: ${String(modules.length)} modules`);

    for (const mod of modules) {
      const manifest = await getModuleManifest(repo, branch.name, mod);
      if (!manifest) {
        continue;
      }

      output.modules[mod] ??= {versions: {}};
      output.modules[mod].versions[branch.name] = manifest;
    }
  }

  // Fetch open migration PRs
  let migrationPRs: ParsedMigrationPR[];
  try {
    migrationPRs = await getMigrationPRs(repo);
  } catch (err: unknown) {
    console.error(`    Error fetching migration PRs for ${repo}: ${String(err)}`);
    migrationPRs = [];
  }

  if (migrationPRs.length > 0) {
    console.error(`    Found ${String(migrationPRs.length)} open migration PRs`);
    for (const migrationPR of migrationPRs) {
      const mod = migrationPR.moduleName;
      const ver = migrationPR.version;
      // Only add migration PR if there's no existing manifest for this version
      const hasExistingVersion = mod in output.modules && ver in output.modules[mod].versions;
      if (!hasExistingVersion) {
        if (!(mod in output.modules)) {
          output.modules[mod] = {versions: {}};
        }
        output.modules[mod].versions[ver] = {migrationPR: migrationPR.pr};
      }
    }
  }

  if (Object.keys(output.modules).length > 0) {
    await writeFile(outputPath, JSON.stringify(output, null, 2) + '\n');
    console.error(`  Wrote ${outputPath} (${String(Object.keys(output.modules).length)} modules)`);
  } else {
    console.error(`  No modules found in ${repo}`);
  }
}

async function main() {
  const token = getGhToken();
  initOctokit(token);

  await mkdir(OUTPUT_DIR, {recursive: true});

  console.error('Listing OCA repos...');
  const repos = await listRepos();
  console.error(`Found ${String(repos.length)} repos`);

  let processed = 0;
  await runWithConcurrency(repos, CONCURRENCY, async repo => {
    processed++;
    console.error(`[${String(processed)}/${String(repos.length)}] ${repo}`);

    try {
      await processRepo(repo);
    } catch (err: unknown) {
      console.error(`  Error processing ${repo}: ${String(err)}`);
    }

    // Periodically check rate limit
    if (processed % 10 === 0) {
      await checkRateLimit();
    }
  });

  console.error('Done!');
}

main().catch((err: unknown) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
