import Document from '@/models/Document';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['name', 'category', 'tagIds', 'fileUrl', 'fileName', 'fileSize', 'mimeType', 'notes'];
const handlers = createCrudHandlers(Document, FIELDS, {
  validate: (d) => (!d.name ? 'Name is required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
