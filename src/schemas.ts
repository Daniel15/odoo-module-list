import {z} from 'zod';

export const migrationPRSchema = z.object({
  createdAt: z.number(),
  title: z.string(),
  updatedAt: z.number(),
  url: z.string().url(),
});

// Manifest directly from __manifest__.py
export const rawModuleManifestSchema = z.object({
  author: z.string(),
  category: z.string(),
  depends: z.array(z.string()).optional(),
  license: z.string(),
  name: z.string(),
  summary: z.string(),
  version: z.string(),
  website: z.string().url().optional(),
});

// Manifest with extra fields added by the scraper (e.g. repository_url)
export const moduleManifestSchema = rawModuleManifestSchema
  .omit({website: true})
  .extend({
    repositoryURL: z.string().url(),
    websiteURL: z.string().url().optional(),
  });

export const moduleVersionSchema = z.union([
  moduleManifestSchema,
  z.object({migrationPR: migrationPRSchema}),
]);

export const moduleInfoSchema = z.object({
  generatedAt: z.number(),
  generatedAtReadable: z.string().datetime(),
  id: z.string(),
  repo: z.string(),
  versions: z.record(z.string(), moduleVersionSchema),
});

export type MigrationPR = z.infer<typeof migrationPRSchema>;
export type ModuleInfo = z.infer<typeof moduleInfoSchema>;
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type ModuleVersion = z.infer<typeof moduleVersionSchema>;
export type RawModuleManifest = z.infer<typeof rawModuleManifestSchema>;
