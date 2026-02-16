import {defineConfig} from 'eslint/config';
import {getStandardESLintAstroConfig} from '@daniel15/standard-astro/eslint';

export default defineConfig(
  getStandardESLintAstroConfig({baseDir: import.meta.dirname}),
);
