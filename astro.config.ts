import compressor from 'astro-compressor';
import purgecss from 'astro-purgecss';
import {defineConfig} from 'astro/config';

export default defineConfig({
  build: {
    assets: '_build',
  },
  integrations: [
    purgecss({
      keyframes: true,
      variables: true,
    }),
    compressor(),
  ],
  site: process.env.SITE_URL ?? 'https://odoomodules.com/',
  vite: {
    css: {
      // https://getbootstrap.com/docs/5.3/getting-started/vite/#configure-vite
      preprocessorOptions: {
        scss: {
          silenceDeprecations: [
            'if-function',
            'import',
            'color-functions',
            'global-builtin',
          ],
        },
      },
    },
  },
});
