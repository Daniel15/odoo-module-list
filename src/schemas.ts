import {z} from 'zod';

export const migrationPRSchema = z.object({
  title: z.string(),
  url: z.string().url(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const moduleManifestSchema = z.object({
  name: z.string(),
  summary: z.string(),
  version: z.string(),
  author: z.string(),
  license: z.string(),
  category: z.string(),
});

export const moduleVersionSchema = z.union([
  moduleManifestSchema,
  z.object({migrationPR: migrationPRSchema}),
]);

export const moduleInfoSchema = z.object({
  versions: z.record(z.string(), moduleVersionSchema),
});

export const repoOutputSchema = z.object({
  repo: z.string(),
  url: z.string().url(),
  modules: z.record(z.string(), moduleInfoSchema),
});

export type MigrationPR = z.infer<typeof migrationPRSchema>;
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type ModuleVersion = z.infer<typeof moduleVersionSchema>;
export type ModuleInfo = z.infer<typeof moduleInfoSchema>;
export type RepoOutput = z.infer<typeof repoOutputSchema>;
