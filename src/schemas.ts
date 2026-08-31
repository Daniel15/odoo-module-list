import {z} from 'astro/zod';

const generatedAtSchema = z.object({
  generatedAt: z
    .number()
    .describe(
      'Date/time at which this data was generated. UNIX timestamp in seconds.',
    ),

  generatedAtReadable: z.iso
    .datetime()
    .describe(
      'Date/time at which this data was generated. Human-readable RFC3339 timestamp.',
    ),
});

export const migrationPRSchema = z
  .object({
    createdAt: z
      .number()
      .describe(
        'Date/time at which the pull request was created. UNIX timestamp in seconds.',
      ),

    title: z.string().describe('Title of the pull request.'),
    updatedAt: z
      .number()
      .describe(
        'Date/time at which the pull request was last updated. UNIX timestamp in seconds',
      ),

    url: z.url().describe('URL to the pull request.'),
  })
  .describe(
    'Information about a migration pull request that updates a module to support a newer version of Odoo.',
  );

// Manifest directly from __manifest__.py
export const rawModuleManifestSchema = z.object({
  author: z.string().describe('Author of the module.'),
  category: z.string().describe('Odoo store category of the module.'),
  depends: z
    .array(z.string())
    .optional()
    .describe('List of the other modules this one depends on.'),
  license: z.string().describe('License of the module, usually LGPL.'),
  name: z.string().describe('Human-friendly name of the module.'),
  summary: z.string().describe('Summary of the module.'),
  version: z.string().describe('Version of the module.'),
  website: z.url().optional().describe('Website of the module.'),
});

// Manifest with extra fields added by the scraper (e.g. repository_url)
export const moduleManifestSchema = rawModuleManifestSchema
  .omit({website: true})
  .extend({
    repositoryURL: z
      .url()
      .describe(
        'URL to the repository of the module. This is usually a deep link to a particular directory in the repo.',
      ),

    websiteURL: z
      .url()
      .optional()
      .describe('URL to the website of the module.'),
  });

export const moduleVersionSchema = z
  .union([moduleManifestSchema, z.object({migrationPR: migrationPRSchema})])
  .describe(
    'Information about a specific version of a module. This can either be a manifest ' +
      '(if the module is compatible with this version of Odoo) or a migration pull ' +
      'request (if the module is not currently compatible, but a pull request has been ' +
      'opened to make it compatible).',
  );

export const moduleInfoSchema = z.object({
  ...generatedAtSchema.shape,
  id: z
    .string()
    .describe(
      'Unique identifier for the module, matching the name of its directory. Usually ' +
        'lowercase and underscore-separated',
    ),

  repo: z
    .string()
    .describe(
      'GitHub repository this module is in, in the format "owner/repo".',
    ),

  versions: z
    .record(z.string(), moduleVersionSchema)
    .describe(
      'All the Odoo versions that this module either currently supports, or has a ' +
        'migration pull request to add support for.',
    ),
});

// Schemas prefixed with "API" are root types accessible on the site as JSON files.
export const apiModulesSchema = z.object({
  ...generatedAtSchema.shape,
  modules: z
    .array(
      z.object({
        id: moduleInfoSchema.shape.id,
        links: z.array(
          z.object({
            rel: z.string(),
            href: z.url(),
          }),
        ),
        name: moduleManifestSchema.shape.name,
        versions: z
          .array(z.string())
          .describe('Versions of Odoo this module supports'),
      }),
    )
    .describe(
      'Summary data about all open-source Odoo modules that we know about.',
    ),
});

export const apiModulesFullSchema = z
  .object({
    ...generatedAtSchema.shape,
    modules: z.array(moduleInfoSchema),
  })
  .describe('Data about all open-source Odoo modules that we know about.');

// Types prefixed with "API" are root types accessible on the site as JSON files.
export type APIModules = z.infer<typeof apiModulesSchema>;
export type APIModulesFull = z.infer<typeof apiModulesFullSchema>;

export type GeneratedAt = z.infer<typeof generatedAtSchema>;
export type MigrationPR = z.infer<typeof migrationPRSchema>;
export type ModuleInfo = z.infer<typeof moduleInfoSchema>;
export type ModuleManifest = z.infer<typeof moduleManifestSchema>;
export type ModuleVersion = z.infer<typeof moduleVersionSchema>;
export type RawModuleManifest = z.infer<typeof rawModuleManifestSchema>;
