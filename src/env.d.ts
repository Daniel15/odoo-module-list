/// <reference types="astro/client" />

declare namespace NodeJS {
  interface ProcessEnv {
    GITHUB_TOKEN?: string;
    SITE_URL?: string;
  }
}
