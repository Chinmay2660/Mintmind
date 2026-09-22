import Reminder from '@/models/Reminder';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['title', 'type', 'dueDate', 'amount', 'status', 'linkedId', 'linkedType', 'notes'];
const handlers = createCrudHandlers(Reminder, FIELDS, {
  sort: { dueDate: 1 },
  validate: (d) => (!d.title || !d.dueDate ? 'Title and due date are required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
