import {z} from 'zod';

export const migrationPRSchema = z.object({
  createdAt: z.number(),
  title: z.string(),
  updatedAt: z.number(),
  url: z.string().url(),
});

export const moduleManifestSchema = z.object({
  author: z.string(),
  category: z.string(),
  license: z.string(),
  name: z.string(),
  summary: z.string(),
  url: z.string().url(),
  version: z.string(),
});

export const moduleVersionSchema = z.union([
  moduleManifestSchema,
  z.object({migrationPR: migrationPRSchema}),
]);

export const moduleInfoSchema = z.object({
  versions: z.record(z.string(), moduleVersionSchema),
});

export const repoOutputSchema = z.object({
  modules: z.record(z.string(), moduleInfoSchema),
  repo: z.string(),
  url: z.string().url(),
});

export type MigrationPR = z.infer<typeof migrationPRSchema>;
export type ModuleInfo = z.infer<typeof moduleInfoSchema>;
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type ModuleVersion = z.infer<typeof moduleVersionSchema>;
export type RepoOutput = z.infer<typeof repoOutputSchema>;
