import Subscription from '@/models/Subscription';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['name', 'amount', 'frequency', 'nextBillingDate', 'categoryId', 'accountId', 'status', 'notes'];
const handlers = createCrudHandlers(Subscription, FIELDS, {
  validate: (d) => (!d.name || !d.amount ? 'Name and amount are required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
