import Loan from '@/models/Loan';
import { createCrudHandlers } from '@/lib/api/crudRoute';

const LOAN_FIELDS = [
  'name', 'type', 'lender', 'principal', 'outstanding', 'interestRate', 'emi', 'currentEmi',
  'tenureMonths', 'remainingMonths', 'startDate', 'accountId', 'isCash',
  'ownership', 'coBorrowers', 'interestType', 'notes',
];
const handlers = createCrudHandlers(Loan, LOAN_FIELDS, {
  validate: (d) => (!d.name || !d.principal ? 'Name and principal are required' : null),
});

export const GET = handlers.GET;
export const POST = handlers.POST;
