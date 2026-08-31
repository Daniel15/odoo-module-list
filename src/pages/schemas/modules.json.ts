import {apiModulesSchema} from '../../schemas';

export const GET = () => Response.json(apiModulesSchema.toJSONSchema());
