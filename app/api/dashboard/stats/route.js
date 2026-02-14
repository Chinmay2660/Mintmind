import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Transaction from '@/models/Transaction';
import BankAccount from '@/models/BankAccount';
import Cash from '@/models/Cash';
import Investment from '@/models/Investment';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get total balance from all accounts
    const accounts = await BankAccount.find({ userId: user._id });
    const totalBankBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

    // Get cash
    const cash = await Cash.findOne({ userId: user._id });
    const totalCash = cash?.amount || 0;

    // Get total investments
    const investments = await Investment.find({ userId: user._id });
    const totalInvestments = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    // Get monthly income and expenses
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
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const monthlyExpenses = await Transaction.aggregate([
      {
        $match: {
          userId: user._id,
          type: 'expense',
          date: { $gte: startOfMonth, $lte: endOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalIncome = monthlyIncome[0]?.total || 0;
    const totalExpenses = monthlyExpenses[0]?.total || 0;
    const netWorth = totalBankBalance + totalCash + totalInvestments;

    return NextResponse.json({
      totalBankBalance,
      totalCash,
      totalInvestments,
      netWorth,
      monthlyIncome: totalIncome,
      monthlyExpenses: totalExpenses,
      monthlySavings: totalIncome - totalExpenses,
      accountCount: accounts.length,
      investmentCount: investments.length,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
