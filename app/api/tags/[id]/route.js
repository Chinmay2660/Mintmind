import Tag from '@/models/Tag';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const TAG_FIELDS = ['name', 'color'];
const handlers = createCrudIdHandlers(Tag, TAG_FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
