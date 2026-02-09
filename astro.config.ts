import {defineConfig} from 'astro/config';

import purgecss from 'astro-purgecss';

export default defineConfig({
  build: {
    assets: '_build',
  },
  compressHTML: false,
  site: process.env.SITE_URL ?? 'https://odoomodules.com/',
  integrations: [
    purgecss({
      keyframes: true,
      variables: true,
    }),
  ],
  vite: {
    css: {
      // https://getbootstrap.com/docs/5.3/getting-started/vite/#configure-vite
      preprocessorOptions: {
        scss: {
          silenceDeprecations: ['if-function', 'import', 'color-functions', 'global-builtin'],
        },
      },
    },
  },
});
