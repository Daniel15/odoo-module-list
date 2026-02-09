import {z} from 'zod';

export const moduleManifestSchema = z.object({
  name: z.string(),
  summary: z.string(),
  version: z.string(),
  author: z.string(),
  license: z.string(),
  category: z.string(),
});

export const moduleInfoSchema = z.object({
  versions: z.record(z.string(), moduleManifestSchema),
});

export const repoOutputSchema = z.object({
  repo: z.string(),
  url: z.string().url(),
  modules: z.record(z.string(), moduleInfoSchema),
});

export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type ModuleInfo = z.infer<typeof moduleInfoSchema>;
export type RepoOutput = z.infer<typeof repoOutputSchema>;
