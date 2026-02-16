import {getStandardESLintAstroConfig} from '@daniel15/standard-astro/eslint';
import {defineConfig} from 'eslint/config';

export default defineConfig(
  getStandardESLintAstroConfig({baseDir: import.meta.dirname}),
);
