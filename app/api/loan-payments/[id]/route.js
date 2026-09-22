import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import LoanPayment from '@/models/LoanPayment';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { reversePaymentOnLoan } from '@/lib/api/loanPayments';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const payment = await LoanPayment.findOne({ _id: id, userId: user._id });
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(payment);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch loan payment');
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const payment = await LoanPayment.findOne({ _id: id, userId: user._id });
    if (!payment) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const loan = await Loan.findOne({ _id: payment.loanId, userId: user._id });
    if (loan) await reversePaymentOnLoan(loan, payment);

    await LoanPayment.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete loan payment');
  }
}
