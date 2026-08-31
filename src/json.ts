import {MS_IN_SEC} from './consts';
import type {GeneratedAt} from './schemas';

/**
 * Add a `$schema` field to the given object, pointing to the JSON Schema for that object.
 */
export function getJSONSchemaURL(schemaName: string): string {
  return `https://odoomodules.com/schemas/${schemaName}.json`;
}

/**
 * Handles boilerplate for `generatedAt` and `generatedAtReadable` fields in JSON files.
 */
export function getGeneratedAtFields(): GeneratedAt {
  return {
    generatedAt: Math.floor(Date.now() / MS_IN_SEC),
    generatedAtReadable: new Date().toISOString(),
  };
}
