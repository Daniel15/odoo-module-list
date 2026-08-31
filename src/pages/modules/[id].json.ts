import {getCollection} from 'astro:content';
import type {ModuleInfo} from '../../schemas';
import {getJSONSchemaURL} from '../../json';

export async function getStaticPaths() {
  const modules = await getCollection('modules');
  return modules.map(module => ({
    params: {id: module.data.id},
    props: {module: module.data},
  }));
}

export function GET({props}: {props: {module: ModuleInfo}}) {
  return Response.json({
    $schema: getJSONSchemaURL('module'),
    ...props.module,
  });
}
