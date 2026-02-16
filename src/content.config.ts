import {glob} from 'astro/loaders';
import {defineCollection} from 'astro:content';

import {repoOutputSchema} from './schemas.ts';

const repos = defineCollection({
  loader: glob({base: './data', pattern: '**/*.json'}),
  schema: repoOutputSchema,
});

export const collections = {repos};
