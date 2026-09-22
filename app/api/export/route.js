import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import Transaction from '@/models/Transaction';
import Investment from '@/models/Investment';
import Budget from '@/models/Budget';
import Goal from '@/models/Goal';
import { toExcelBuffer, TRANSACTION_COLUMNS, INVESTMENT_COLUMNS } from '@/lib/utils/exportData';

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const type = new URL(request.url).searchParams.get('type') || 'transactions';
    const sheets = [];

    if (type === 'transactions' || type === 'all') {
      const txs = await Transaction.find({ userId: user._id }).populate('categoryId').sort({ date: -1 }).limit(5000);
      sheets.push({
        name: 'Transactions',
        columns: TRANSACTION_COLUMNS,
        rows: txs.map((t) => ({
          date: t.date?.toISOString?.()?.split('T')[0] || '',
          type: t.type,
          description: t.description || '',
          amount: t.amount,
          category: t.categoryId?.name || '',
          account: t.isCash ? 'Cash' : t.accountId?.toString() || '',
        })),
      });
    }

    if (type === 'investments' || type === 'all') {
      const invs = await Investment.find({ userId: user._id }).sort({ investedDate: -1 });
      sheets.push({
        name: 'Investments',
        columns: INVESTMENT_COLUMNS,
        rows: invs.map((i) => ({
          name: i.name,
          type: i.type,
          amount: i.amount,
          currentValue: i.currentValue || i.amount,
          investedDate: i.investedDate?.toISOString?.()?.split('T')[0] || '',
        })),
      });
    }

    if (type === 'budgets' || type === 'all') {
      const budgets = await Budget.find({ userId: user._id });
      sheets.push({
        name: 'Budgets',
        columns: [{ key: 'name', label: 'Name' }, { key: 'amount', label: 'Amount' }, { key: 'period', label: 'Period' }],
        rows: budgets.map((b) => ({ name: b.name, amount: b.amount, period: b.period || 'monthly' })),
      });
    }

    if (type === 'goals' || type === 'all') {
      const goals = await Goal.find({ userId: user._id });
      sheets.push({
        name: 'Goals',
        columns: [{ key: 'title', label: 'Goal' }, { key: 'targetAmount', label: 'Target' }, { key: 'currentAmount', label: 'Current' }, { key: 'targetDate', label: 'Target Date' }],
        rows: goals.map((g) => ({
          title: g.title,
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount,
          targetDate: g.targetDate?.toISOString?.()?.split('T')[0] || '',
        })),
      });
    }

    const buffer = toExcelBuffer(sheets);
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="mintmind-${type}-${Date.now()}.xlsx"`,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to export data');
  }
}
