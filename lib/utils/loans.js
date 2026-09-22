import { loanAmortization } from './planners'

export function calculateEmi(principal, interestRate, tenureMonths) {
  const p = Number(principal) || 0
  const months = Number(tenureMonths) || 0
  if (p <= 0 || months <= 0) return 0
  const r = (Number(interestRate) || 0) / 100 / 12
  if (r === 0) return p / months
  return (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1)
}

export function monthlyInterestDue(outstanding, interestRate) {
  const balance = Number(outstanding) || 0
  const r = (Number(interestRate) || 0) / 100 / 12
  return Math.round(balance * r * 100) / 100
}

export function calculateRemainingMonths(outstanding, interestRate, emi) {
  const balance = Number(outstanding) || 0
  const payment = Number(emi) || 0
  if (balance <= 0) return 0
  if (payment <= 0) return null

  const r = (Number(interestRate) || 0) / 100 / 12
  if (r === 0) return Math.ceil(balance / payment)

  let months = 0
  let current = balance
  const maxMonths = 600
  while (current > 0.01 && months < maxMonths) {
    const interest = current * r
    const principalPaid = Math.min(current, payment - interest)
    if (principalPaid <= 0) return null
    current -= principalPaid
    months++
  }
  return months
}

/** EMI: interest first, rest to principal. Prepayment: 100% principal. */
export function splitLoanPayment(outstanding, interestRate, amount, paymentType = 'emi', actualEmi = 0) {
  const balance = Number(outstanding) || 0
  const payment = Number(amount) || 0

  if (['prepayment', 'advance'].includes(paymentType)) {
    return {
      interestPaid: 0,
      principalPaid: Math.round(Math.min(balance, payment) * 100) / 100,
      extraPrincipal: Math.round(Math.min(balance, payment) * 100) / 100,
    }
  }

  const r = (Number(interestRate) || 0) / 100 / 12
  const interestPaid = Math.min(payment, balance * r)
  const principalPaid = Math.min(balance, Math.max(0, payment - interestPaid))

  // Extra beyond contractual EMI principal portion
  const contractualInterest = monthlyInterestDue(balance, interestRate)
  const contractualPrincipal = Math.max(0, (Number(actualEmi) || payment) - contractualInterest)
  const extraPrincipal = Math.max(0, principalPaid - contractualPrincipal)

  return {
    interestPaid: Math.round(interestPaid * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
    extraPrincipal: Math.round(extraPrincipal * 100) / 100,
  }
}

export function buildLoanSummary(loan, payments = []) {
  const principal = Number(loan.principal) || 0
  const outstanding = Number(loan.outstanding) ?? principal
  const interestRate = Number(loan.interestRate) || 0
  const tenureMonths = Number(loan.tenureMonths) || 0
  const actualEmi = Number(loan.emi) || calculateEmi(principal, interestRate, tenureMonths)
  const currentEmi = Number(loan.currentEmi) || actualEmi

  const paidPrincipal = payments.reduce((sum, p) => sum + (Number(p.principalPaid) || 0), 0)
  const paidInterest = payments.reduce((sum, p) => sum + (Number(p.interestPaid) || 0), 0)

  const prepaymentPayments = payments.filter((p) =>
    ['prepayment', 'advance'].includes(p.paymentType)
  )
  const prepaymentTotal = prepaymentPayments.reduce(
    (sum, p) => sum + (Number(p.principalPaid) || 0),
    0
  )
  const extraPrincipalTotal = payments.reduce(
    (sum, p) => sum + (Number(p.extraPrincipal) || 0),
    0
  )

  const amort = tenureMonths > 0
    ? loanAmortization({ principal, interestRate, tenureMonths })
    : { emi: 0, totalInterest: 0, schedule: [] }

  const payoffEmi = currentEmi > 0 ? currentEmi : actualEmi
  const remainingMonths =
    loan.remainingMonths ??
    calculateRemainingMonths(outstanding, interestRate, payoffEmi) ??
    0

  const remainingAtActualEmi = calculateRemainingMonths(outstanding, interestRate, actualEmi)
  const monthsSaved = remainingAtActualEmi != null && remainingMonths < remainingAtActualEmi
    ? remainingAtActualEmi - remainingMonths
    : 0

  const projectedInterestRemaining = amort.schedule
    .slice(Math.max(0, tenureMonths - remainingMonths))
    .reduce((sum, row) => sum + row.interest, 0)

  const interestDueNow = monthlyInterestDue(outstanding, interestRate)
  const nextPaymentSplit = splitLoanPayment(outstanding, interestRate, currentEmi, 'emi', actualEmi)

  return {
    actualEmi,
    currentEmi,
    extraEmiAmount: Math.max(0, currentEmi - actualEmi),
    emi: actualEmi, // backwards compat
    totalProjectedInterest: amort.totalInterest,
    interestPaid: paidInterest,
    principalPaid: paidPrincipal,
    prepaymentTotal,
    prepaymentCount: prepaymentPayments.length,
    extraPrincipalTotal,
    projectedInterestRemaining,
    remainingMonths,
    monthsSaved,
    interestDueNow,
    nextPrincipalReduction: nextPaymentSplit.principalPaid,
    nextExtraPrincipal: nextPaymentSplit.extraPrincipal,
    progressPercent: principal > 0 ? Math.min(100, (paidPrincipal / principal) * 100) : 0,
    schedule: amort.schedule,
  }
}
