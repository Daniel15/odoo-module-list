import {getCollection} from 'astro:content';

import type {APIModulesFull} from '../schemas';

import {getGeneratedAtFields, getJSONSchemaURL} from '../json';

export async function GET() {
  const modules = (await getCollection('modules')).map(module => module.data);
  const response: APIModulesFull = {
    ...getGeneratedAtFields(),
    modules,
  };
  return Response.json({
    $schema: getJSONSchemaURL('modules-full'),
    ...response,
  });
}
