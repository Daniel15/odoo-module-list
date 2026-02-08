import {defineConfig} from 'eslint/config';
import {getStandardESLintConfig} from '@daniel15/standard/eslint';

export default defineConfig(getStandardESLintConfig({baseDir: import.meta.dirname}));
