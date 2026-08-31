import {getCollection} from 'astro:content';

import type {APIModules} from '../schemas';

import {getGeneratedAtFields, getJSONSchemaURL} from '../json';
import {getLatestManifest} from '../modules';

export async function GET() {
  const response: APIModules = {
    ...getGeneratedAtFields(),
    modules: (await getCollection('modules'))
      .map(module => {
        const latestManifest = getLatestManifest(module.data);
        if (latestManifest == null) {
          return null;
        }
        return {
          id: module.data.id,
          links: [
            {
              rel: 'item',
              href: `/modules/${module.data.id}.json`,
            },
          ],
          name: latestManifest.name,
          summary: latestManifest.summary,
          versions: Object.keys(module.data.versions).sort((a, b) =>
            a.localeCompare(b),
          ),
        };
      })
      .filter(module => module != null),
  };
  return Response.json({
    $schema: getJSONSchemaURL('modules'),
    ...response,
  });
}
