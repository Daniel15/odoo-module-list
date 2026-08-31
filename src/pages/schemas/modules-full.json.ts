import {apiModulesFullSchema} from '../../schemas';

export const GET = () => Response.json(apiModulesFullSchema.toJSONSchema());
