import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import Transaction from '@/models/Transaction';
import Investment from '@/models/Investment';
import Budget from '@/models/Budget';
import Salary from '@/models/Salary';
import BankAccount from '@/models/BankAccount';
import Cash from '@/models/Cash';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's family
    const family = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (!family) {
      return NextResponse.json({ error: 'Not part of a family' }, { status: 404 });
    }

    // Active member user IDs (head is included in members array)
    const memberIds = family.members
      .filter(m => m.status === 'active')
      .map(m => m.user);

    // Aggregate family data
    const [
      totalInvestments,
      totalExpenses,
      totalIncome,
      totalBudgets,
      totalSalary,
      totalBalance,
      totalCash,
    ] = await Promise.all([
      // Total Investments
      Investment.aggregate([
        { $match: { userId: { $in: memberIds } } },
        { $group: { _id: null, total: { $sum: '$amountInvested' } } },
      ]),
      
      // Total Expenses (last 30 days)
      Transaction.aggregate([
        {
          $match: {
            userId: { $in: memberIds },
            type: 'expense',
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // Total Income (last 30 days)
      Transaction.aggregate([
        {
          $match: {
            userId: { $in: memberIds },
            type: 'income',
            date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // Total Budgets
      Budget.aggregate([
        { $match: { userId: { $in: memberIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // Total Salary (monthly)
      Salary.aggregate([
        { $match: { userId: { $in: memberIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      
      // Total Bank Account Balance
      BankAccount.aggregate([
        { $match: { userId: { $in: memberIds } } },
        { $group: { _id: null, total: { $sum: '$balance' } } },
      ]),
      
      // Total Cash
      Cash.aggregate([
        { $match: { userId: { $in: memberIds } } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const stats = {
      totalInvestments: totalInvestments[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      totalIncome: totalIncome[0]?.total || 0,
      totalBudgets: totalBudgets[0]?.total || 0,
      totalSalary: totalSalary[0]?.total || 0,
      totalBalance: (totalBalance[0]?.total || 0) + (totalCash[0]?.total || 0),
      memberCount: memberIds.length,
    };

    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

