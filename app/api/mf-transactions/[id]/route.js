import MFTransaction from '@/models/MFTransaction';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['investmentId', 'type', 'date', 'units', 'nav', 'amount', 'notes'];
const handlers = createCrudIdHandlers(MFTransaction, FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
