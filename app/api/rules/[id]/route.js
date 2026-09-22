import Rule from '@/models/Rule';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const RULE_FIELDS = ['name', 'enabled', 'priority', 'conditions', 'actions'];
const handlers = createCrudIdHandlers(Rule, RULE_FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
