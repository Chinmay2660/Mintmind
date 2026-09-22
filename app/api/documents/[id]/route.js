import Document from '@/models/Document';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const FIELDS = ['name', 'category', 'tagIds', 'fileUrl', 'fileName', 'fileSize', 'mimeType', 'notes'];
const handlers = createCrudIdHandlers(Document, FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
