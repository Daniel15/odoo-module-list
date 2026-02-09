import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import type {ModuleManifest} from '../schemas.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARSER_SCRIPT = join(__dirname, 'parse_manifest.py');

const RAW_BASE = 'https://raw.githack.com/OCA';

/**
 * Fetch a __manifest__.py file from raw.githack.com.
 */
async function fetchManifestContent(
  repo: string,
  branch: string,
  module: string,
): Promise<string | null> {
  const url = `${RAW_BASE}/${repo}/${branch}/${module}/__manifest__.py`;
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        if (attempt < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        console.error(`Failed to fetch ${url}: ${String(response.status)}`);
        return null;
      }
      return await response.text();
    } catch (err: unknown) {
      if (attempt < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      console.error(`Error fetching ${url}: ${String(err)}`);
      return null;
    }
  }
  return null;
}

/**
 * Parse manifest content by piping it through the Python helper script.
 */
function parseManifestContent(content: string): Promise<ModuleManifest | null> {
  return new Promise(resolve => {
    const proc = spawn('python3', [PARSER_SCRIPT], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString();
    });
    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on('close', code => {
      if (code !== 0) {
        console.error(`parse_manifest.py failed: ${stderr || stdout}`);
        resolve(null);
        return;
      }
      try {
        const parsed: unknown = JSON.parse(stdout);
        if (
          typeof parsed === 'object' &&
          parsed !== null &&
          'error' in parsed &&
          typeof (parsed as {error: unknown}).error === 'string'
        ) {
          console.error(`Manifest parse error: ${(parsed as {error: string}).error}`);
          resolve(null);
          return;
        }
        resolve(parsed as ModuleManifest);
      } catch {
        console.error(`Invalid JSON from parser: ${stdout}`);
        resolve(null);
      }
    });

    proc.stdin.write(content);
    proc.stdin.end();
  });
}

/**
 * Fetch and parse a module's __manifest__.py file.
 */
export async function getModuleManifest(
  repo: string,
  branch: string,
  module: string,
): Promise<ModuleManifest | null> {
  const content = await fetchManifestContent(repo, branch, module);
  if (!content) {
    return null;
  }
  return parseManifestContent(content);
}
