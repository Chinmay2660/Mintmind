import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Loan from '@/models/Loan';
import LoanPayment from '@/models/LoanPayment';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import { applyPaymentToLoan } from '@/lib/api/loanPayments';
import { splitLoanPayment } from '@/lib/utils/loans';

const PAYMENT_FIELDS = [
  'loanId', 'date', 'amount', 'principalPaid', 'interestPaid',
  'paymentType', 'isCash', 'accountId', 'notes',
];

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const query = { userId: user._id };
    const loanId = searchParams.get('loanId');
    if (loanId) query.loanId = loanId;

    const payments = await LoanPayment.find(query).sort({ date: -1 });
    return NextResponse.json(payments);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch loan payments');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, PAYMENT_FIELDS);

    if (!data.loanId || !data.amount || data.amount <= 0) {
      return NextResponse.json({ error: 'Loan and amount are required' }, { status: 400 });
    }

    const loan = await Loan.findOne({ _id: data.loanId, userId: user._id });
    if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const outstanding = loan.outstanding ?? loan.principal;
    let principalPaid = data.principalPaid;
    let interestPaid = data.interestPaid;
    let extraPrincipal = 0;

    if (principalPaid == null || interestPaid == null) {
      const split = splitLoanPayment(
        outstanding,
        loan.interestRate,
        data.amount,
        data.paymentType || 'emi',
        loan.emi
      );
      principalPaid = split.principalPaid;
      interestPaid = split.interestPaid;
      extraPrincipal = split.extraPrincipal || 0;
    }

    const payment = await LoanPayment.create({
      ...data,
      userId: user._id,
      principalPaid,
      interestPaid,
      extraPrincipal,
      isCash: data.isCash ?? false,
      accountId: data.isCash ? null : data.accountId,
      date: data.date ? new Date(data.date) : new Date(),
    });

    await applyPaymentToLoan(loan, payment);
    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create loan payment');
  }
}
