import {defineCollection} from 'astro:content';
import {glob} from 'astro/loaders';
import {repoOutputSchema} from './schemas.ts';

const repos = defineCollection({
  loader: glob({pattern: '*.json', base: './data'}),
  schema: repoOutputSchema,
});

export const collections = {repos};
