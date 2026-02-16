# OdooModules

This is the source code for OdooModules.com. It contains two parts:

## Scraper

The code in `scraper/` is used to gather data from GitHub repositories. The data is saved into JSON files in the `data` directory.

Run it using `npm run scrape`

## Website

The rest of the repo contains the actual website itself. It's a static site (no server-side component) built using Astro.

Run it using `npm run dev` for development mode (with hot reloading), or `npm run build` to build the production site into a `dist/` directory. Both of these commands require the scraper to have been ran first.
