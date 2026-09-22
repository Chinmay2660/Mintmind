import Loan from '@/models/Loan';
import { calculateRemainingMonths } from '@/lib/utils/loans';

export async function applyPaymentToLoan(loan, payment) {
  const outstanding = Math.max(0, (loan.outstanding ?? loan.principal) - payment.principalPaid);
  const updates = { outstanding };

  const payoffEmi = loan.currentEmi || loan.emi;
  if (['prepayment', 'advance'].includes(payment.paymentType) && payoffEmi > 0) {
    const remaining = calculateRemainingMonths(outstanding, loan.interestRate, payoffEmi);
    if (remaining != null) updates.remainingMonths = remaining;
  } else if (loan.remainingMonths > 0) {
    updates.remainingMonths = Math.max(0, loan.remainingMonths - 1);
  }

  return Loan.findByIdAndUpdate(loan._id, updates, { new: true });
}

export async function reversePaymentOnLoan(loan, payment) {
  const outstanding = (loan.outstanding ?? 0) + payment.principalPaid;
  const updates = { outstanding };

  const payoffEmi = loan.currentEmi || loan.emi;
  if (['prepayment', 'advance'].includes(payment.paymentType) && payoffEmi > 0) {
    const remaining = calculateRemainingMonths(outstanding, loan.interestRate, payoffEmi);
    if (remaining != null) updates.remainingMonths = remaining;
  } else if (loan.remainingMonths != null) {
    updates.remainingMonths = loan.remainingMonths + 1;
  }

  return Loan.findByIdAndUpdate(loan._id, updates, { new: true });
}
