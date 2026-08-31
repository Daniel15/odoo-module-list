import type {ModuleInfo, ModuleManifest} from './schemas';
import {LATEST_ODOO_VERSION} from './consts';

export function getLatestManifest(module: ModuleInfo): ModuleManifest | null {
  // Start at the latest version, and work backwards until we find a manifest
  // for the specified module.
  for (let i = parseInt(LATEST_ODOO_VERSION, 10); i > 1; i--) {
    const version = `${i}.0`;
    const versionData = module.versions[version];
    if (versionData && 'summary' in versionData) {
      return versionData;
    }
  }
  return null;
}
