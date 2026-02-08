export interface ModuleManifest {
  name: string;
  summary: string;
  version: string;
  author: string;
  license: string;
  category: string;
}

export interface ModuleInfo {
  versions: Record<string, ModuleManifest>;
}

export interface RepoOutput {
  repo: string;
  url: string;
  modules: Record<string, ModuleInfo>;
}
