import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import LoanPayment from '@/models/LoanPayment';
import { createCrudIdHandlers } from '@/lib/api/crudRoute';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';

const LOAN_FIELDS = [
  'name', 'type', 'lender', 'principal', 'outstanding', 'interestRate', 'emi', 'currentEmi',
  'tenureMonths', 'remainingMonths', 'startDate', 'accountId', 'isCash',
  'ownership', 'coBorrowers', 'interestType', 'notes',
];
const handlers = createCrudIdHandlers(Loan, LOAN_FIELDS);

export const GET = handlers.GET;
export const PUT = handlers.PUT;

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const loan = await Loan.findOneAndDelete({ _id: id, userId: user._id });
    if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await LoanPayment.deleteMany({ loanId: id, userId: user._id });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete Loan');
  }
}
