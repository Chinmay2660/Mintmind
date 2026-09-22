import SipPlan from '@/models/SipPlan';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['name', 'investmentId', 'schemeCode', 'amount', 'frequency', 'nextDate', 'accountId', 'goalId', 'status'];
const handlers = createCrudIdHandlers(SipPlan, FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
