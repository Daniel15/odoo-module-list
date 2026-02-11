import {defineConfig} from 'astro/config';

import zlib from 'node:zlib';
import purgecss from 'astro-purgecss';
import compressor from 'astro-compressor';

export default defineConfig({
  build: {
    assets: '_build',
  },
  site: process.env.SITE_URL ?? 'https://odoomodules.com/',
  integrations: [
    purgecss({
      keyframes: true,
      variables: true,
    }),
    compressor({
      brotli: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]:
            zlib.constants.BROTLI_MAX_QUALITY,
        },
      },
      zstd: {
        params: {
          [zlib.constants.ZSTD_c_compressionLevel]: 19,
        },
      },
    }),
  ],
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
