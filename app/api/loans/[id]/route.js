import Loan from '@/models/Loan';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';

const LOAN_FIELDS = ['name', 'type', 'lender', 'principal', 'outstanding', 'interestRate', 'emi', 'tenureMonths', 'remainingMonths', 'startDate', 'accountId', 'notes'];
const handlers = createCrudIdHandlers(Loan, LOAN_FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;
export const DELETE = handlers.DELETE;
