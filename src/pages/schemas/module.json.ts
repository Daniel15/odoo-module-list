import {moduleInfoSchema} from '../../schemas';

export const GET = () => Response.json(moduleInfoSchema.toJSONSchema());
