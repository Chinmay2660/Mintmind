/** Monthly savings needed to reach target */
export function requiredMonthlySaving({ targetAmount, currentAmount, targetDate, expectedReturn = 8 }) {
  const remaining = Math.max(0, targetAmount - currentAmount);
  if (remaining <= 0) return 0;
  const months = monthsUntil(targetDate);
  if (months <= 0) return remaining;
  const r = expectedReturn / 100 / 12;
  if (r === 0) return remaining / months;
  return (remaining * r) / (Math.pow(1 + r, months) - 1);
}

/** Future value projection */
export function projectedValue({ currentAmount, monthlyContribution, months, expectedReturn = 8 }) {
  const r = expectedReturn / 100 / 12;
  let fv = currentAmount;
  for (let i = 0; i < months; i++) {
    fv = fv * (1 + r) + monthlyContribution;
  }
  return fv;
}

export function retirementPlanner({
  currentAge, retirementAge, currentInvestments, monthlyInvestment,
  expectedReturn = 10, inflation = 6, desiredCorpus,
}) {
  const years = retirementAge - currentAge;
  const months = years * 12;
  const projected = projectedValue({ currentAmount: currentInvestments, monthlyContribution: monthlyInvestment, months, expectedReturn });
  const inflatedCorpus = desiredCorpus * Math.pow(1 + inflation / 100, years);
  const gap = inflatedCorpus - projected;
  const requiredMonthly = gap > 0 ? requiredMonthlySaving({ targetAmount: inflatedCorpus, currentAmount: currentInvestments, targetDate: addYears(new Date(), years), expectedReturn }) : 0;
  return { projected, inflatedCorpus, gap, requiredMonthly, years };
}

export function firePlanner({ annualExpenses, currentCorpus, monthlyInvestment, expectedReturn = 10, savingsRate = 0 }) {
  const fireNumber = annualExpenses * 25;
  const gap = Math.max(0, fireNumber - currentCorpus);
  const r = expectedReturn / 100 / 12;
  let corpus = currentCorpus;
  let months = 0;
  const maxMonths = 50 * 12;
  while (corpus < fireNumber && months < maxMonths) {
    corpus = corpus * (1 + r) + monthlyInvestment;
    months++;
  }
  const years = months / 12;
  return { fireNumber, currentCorpus, gap, estimatedYears: years, savingsRate };
}

export function loanAmortization({ principal, interestRate, tenureMonths, extraPayment = 0 }) {
  const r = interestRate / 100 / 12;
  const emi = r === 0 ? principal / tenureMonths : (principal * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  let balance = principal;
  let totalInterest = 0;
  let totalPrincipal = 0;
  const schedule = [];
  for (let m = 1; m <= tenureMonths && balance > 0.01; m++) {
    const interest = balance * r;
    const principalPaid = Math.min(balance, emi - interest + extraPayment);
    balance -= principalPaid;
    totalInterest += interest;
    totalPrincipal += principalPaid;
    schedule.push({ month: m, emi: emi + extraPayment, interest, principal: principalPaid, balance: Math.max(0, balance) });
  }
  return { emi, totalInterest, totalPrincipal, schedule };
}

function monthsUntil(date) {
  if (!date) return 12;
  const d = new Date(date);
  const now = new Date();
  return Math.max(1, (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth()));
}

function addYears(date, years) {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}
