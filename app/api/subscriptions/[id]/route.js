import Subscription from '@/models/Subscription';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['name', 'amount', 'frequency', 'nextBillingDate', 'categoryId', 'accountId', 'status', 'notes'];
const handlers = createCrudIdHandlers(Subscription, FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
