import {glob} from 'astro/loaders';
import {defineCollection} from 'astro:content';

import {moduleInfoSchema} from './schemas';

const modules = defineCollection({
  loader: glob({base: './data', pattern: '*.json'}),
  schema: moduleInfoSchema,
});

export const collections = {modules};
