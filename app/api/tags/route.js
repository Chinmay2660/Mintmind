import Tag from '@/models/Tag';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const TAG_FIELDS = ['name', 'color'];
const handlers = createCrudHandlers(Tag, TAG_FIELDS, {
  sort: { name: 1 },
  validate: (d) => (!d.name ? 'Name is required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
