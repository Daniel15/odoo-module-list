import compressor from 'astro-compressor';
import purgecss from 'astro-purgecss';
import {defineConfig} from 'astro/config';
import zlib from 'node:zlib';

export default defineConfig({
  build: {
    assets: '_build',
  },
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
