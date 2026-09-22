import Rule from '@/models/Rule';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const RULE_FIELDS = ['name', 'enabled', 'priority', 'conditions', 'actions'];
const handlers = createCrudHandlers(Rule, RULE_FIELDS, {
  sort: { priority: -1 },
  validate: (d) => (!d.name ? 'Name is required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
