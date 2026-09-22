import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Transaction from '@/models/Transaction';
import BankAccount from '@/models/BankAccount';
import Cash from '@/models/Cash';
import Investment from '@/models/Investment';
import CreditCard from '@/models/CreditCard';
import Loan from '@/models/Loan';
import PasswordEntry from '@/models/PasswordEntry';
import Document from '@/models/Document';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { recordActivity } from '@/lib/legacy/release';

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await recordActivity(user._id);

    const [accounts, cash, investments, creditCards, loans, passwordCount, documentCount] = await Promise.all([
      BankAccount.find({ userId: user._id }),
      Cash.findOne({ userId: user._id }),
      Investment.find({ userId: user._id }),
      CreditCard.find({ userId: user._id }),
      Loan.find({ userId: user._id }),
      PasswordEntry.countDocuments({ userId: user._id }),
      Document.countDocuments({ userId: user._id }),
    ]);

    const totalBankBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalCash = cash?.amount || 0;
    const totalInvested = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalInvestmentValue = investments.reduce(
      (sum, inv) => sum + (inv.currentValue ?? inv.amount ?? 0),
      0
    );
    const totalCreditDue = creditCards.reduce((sum, card) => sum + (card.currentBalance || 0), 0);
    const totalLoanOutstanding = loans.reduce((sum, loan) => sum + (loan.outstanding || 0), 0);
    const totalLiabilities = totalCreditDue + totalLoanOutstanding;
    const totalAssets = totalBankBalance + totalCash + totalInvestmentValue;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const monthlyIncome = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          type: 'income',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const monthlyExpenses = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    const totalIncome = monthlyIncome[0]?.total || 0;
    const totalExpenses = monthlyExpenses[0]?.total || 0;
    const monthlySavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? Math.round((monthlySavings / totalIncome) * 100) : 0;

    return NextResponse.json({
      totalBankBalance,
      totalCash,
      totalInvestments: totalInvested,
      totalInvestmentValue,
      totalInvested,
      totalAssets,
      totalLiabilities,
      totalCreditDue,
      totalLoanOutstanding,
      netWorth: totalAssets - totalLiabilities,
      investmentGain: totalInvestmentValue - totalInvested,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      monthlySavings,
      savingsRate,
      accountCount: accounts.length,
      investmentCount: investments.length,
      creditCardCount: creditCards.length,
      loanCount: loans.length,
      passwordCount,
      documentCount,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
