import Reminder from '@/models/Reminder';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['title', 'type', 'dueDate', 'amount', 'status', 'linkedId', 'linkedType', 'notes'];
const handlers = createCrudIdHandlers(Reminder, FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
