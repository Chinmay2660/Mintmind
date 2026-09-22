import { splitLoanPayment } from '@/lib/utils/loans'

function emiPayments({ loanId, principal, emi, rate, days, accountId, daysAgo }) {
  const payments = []
  let outstanding = principal

  for (const day of days) {
    const split = splitLoanPayment(outstanding, rate, emi, 'emi', emi)
    payments.push({
      loanId,
      date: daysAgo(day),
      amount: emi,
      principalPaid: split.principalPaid,
      interestPaid: split.interestPaid,
      extraPrincipal: split.extraPrincipal,
      paymentType: 'emi',
      accountId,
    })
    outstanding -= split.principalPaid
  }

  return payments
}

/** Shared loan payment history for server + offline demo seeds */
export function buildDemoLoanPayments({ homeLoanId, carLoanId, homeAccountId, carAccountId, daysAgo }) {
  const homeEmis = emiPayments({
    loanId: homeLoanId,
    principal: 4500000,
    emi: 38500,
    rate: 8.5,
    days: [180, 150, 120, 90, 60, 30],
    accountId: homeAccountId,
    daysAgo,
  })

  const prepayment = {
    loanId: homeLoanId,
    date: daysAgo(45),
    amount: 100000,
    principalPaid: 100000,
    interestPaid: 0,
    extraPrincipal: 100000,
    paymentType: 'prepayment',
    accountId: homeAccountId,
    notes: 'Annual bonus prepayment',
  }

  const carEmis = emiPayments({
    loanId: carLoanId,
    principal: 600000,
    emi: 12500,
    rate: 9.2,
    days: [90, 60, 30],
    accountId: carAccountId,
    daysAgo,
  })

  return [...homeEmis, prepayment, ...carEmis]
}
