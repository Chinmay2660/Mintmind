import SipPlan from '@/models/SipPlan';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['name', 'investmentId', 'schemeCode', 'amount', 'frequency', 'nextDate', 'accountId', 'goalId', 'status'];
const handlers = createCrudHandlers(SipPlan, FIELDS, {
  validate: (d) => (!d.name || !d.amount ? 'Name and amount are required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
