import {spawn} from 'node:child_process';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

import {type RawModuleManifest, rawModuleManifestSchema} from '../schemas.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PARSER_SCRIPT = join(__dirname, 'parse_manifest.py');

/**
 * Fetch and parse a module's __manifest__.py file.
 */
export async function getModuleManifest(
  owner: string,
  repo: string,
  branch: string,
  module: string,
): Promise<null | RawModuleManifest> {
  const content = await fetchManifestContent(owner, repo, branch, module);
  if (!content) {
    return null;
  }
  return parseManifestContent(content);
}

/**
 * Fetch a __manifest__.py file from raw.githack.com.
 */
async function fetchManifestContent(
  owner: string,
  repo: string,
  branch: string,
  module: string,
): Promise<null | string> {
  const url = `https://raw.githack.com/${owner}/${repo}/${branch}/${module}/__manifest__.py`;
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
function parseManifestContent(
  content: string,
): Promise<null | RawModuleManifest> {
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
        const json: unknown = JSON.parse(stdout);
        if (
          typeof json === 'object' &&
          json !== null &&
          'error' in json &&
          typeof (json as {error: unknown}).error === 'string'
        ) {
          console.error(
            `Manifest parse error: ${(json as {error: string}).error}`,
          );
          resolve(null);
          return;
        }

        resolve(rawModuleManifestSchema.parse(json));
      } catch (ex: unknown) {
        console.error(
          `Invalid JSON from parser: ${stdout}. Error: ${ex instanceof Error ? ex.message : String(ex)}`,
        );
        resolve(null);
      }
    });

    proc.stdin.write(content);
    proc.stdin.end();
  });
}
