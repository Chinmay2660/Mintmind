import {
  requireAuth,
  pick,
  assertAccountOwnership,
  assertCategoryOwnership,
  safeErrorResponse,
} from '@/lib/middleware/api';
import { applyTransactionBalances } from '@/lib/api/transactionBalance';
import Transaction from '@/models/Transaction';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const TRANSACTION_FIELDS = [
  'type', 'amount', 'categoryId', 'accountId', 'isCash',
  'description', 'date', 'transferToAccountId', 'transferToIsCash',
];

function buildTransactionQuery(userId, searchParams) {
  const query = { userId };
  const andClauses = [];

  const type = searchParams.get('type');
  const types = searchParams.get('types');
  if (types) {
    query.type = { $in: types.split(',').filter(Boolean) };
  } else if (type) {
    query.type = type;
  }

  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  const categoryId = searchParams.get('categoryId');
  if (categoryId) query.categoryId = categoryId;

  const accountId = searchParams.get('accountId');
  const isCash = searchParams.get('isCash');
  if (accountId) {
    andClauses.push({
      $or: [{ accountId }, { transferToAccountId: accountId }],
    });
  } else if (isCash === 'true') {
    andClauses.push({
      $or: [{ isCash: true }, { transferToIsCash: true }],
    });
  }

  const search = searchParams.get('search')?.trim();
  if (search) {
    andClauses.push({
      description: { $regex: search, $options: 'i' },
    });
  }

  if (andClauses.length === 1) {
    Object.assign(query, andClauses[0]);
  } else if (andClauses.length > 1) {
    query.$and = andClauses;
  }

  return query;
}

function summarize(transactions) {
  return transactions.reduce(
    (acc, tx) => {
      if (tx.type === 'income') acc.income += tx.amount;
      else if (tx.type === 'expense') acc.expense += tx.amount;
      else if (tx.type === 'transfer') {
        acc.transferOut += tx.amount;
        acc.transferIn += tx.amount;
      }
      acc.net = acc.income - acc.expense;
      return acc;
    },
    { income: 0, expense: 0, transferIn: 0, transferOut: 0, net: 0 }
  );
}

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '500', 10), 1000);
    const includeSummary = searchParams.get('summary') === 'true';

    const query = buildTransactionQuery(user._id, searchParams);

    const transactions = await Transaction.find(query)
      .populate('categoryId')
      .populate('accountId')
      .populate('transferToAccountId')
      .sort({ date: -1 })
      .limit(limit);

    if (includeSummary) {
      return NextResponse.json({ transactions, summary: summarize(transactions) });
    }

    return NextResponse.json(transactions);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch transactions');
  }
}

async function validateTransactionData(user, data) {
  if (!data.amount || data.amount <= 0) {
    return { error: 'Amount must be greater than 0' };
  }

  if (data.type === 'transfer') {
    const hasFrom = data.isCash || data.accountId;
    const hasTo = data.transferToIsCash || data.transferToAccountId;
    if (!hasFrom || !hasTo) {
      return { error: 'Both source and destination accounts are required for transfers' };
    }
    if (data.isCash && data.transferToIsCash) {
      return { error: 'Cannot transfer cash to cash' };
    }
    if (!data.isCash && data.accountId) {
      const account = await assertAccountOwnership(user._id, data.accountId);
      if (!account) return { error: 'Invalid source account' };
    }
    if (!data.transferToIsCash && data.transferToAccountId) {
      const account = await assertAccountOwnership(user._id, data.transferToAccountId);
      if (!account) return { error: 'Invalid destination account' };
    }
    if (
      !data.isCash &&
      !data.transferToIsCash &&
      data.accountId === data.transferToAccountId
    ) {
      return { error: 'Source and destination accounts must be different' };
    }
    return null;
  }

  if (!data.categoryId) {
    return { error: 'Category is required' };
  }

  const category = await assertCategoryOwnership(user._id, data.categoryId);
  if (!category) return { error: 'Invalid category' };

  if (!data.isCash && !data.accountId) {
    return { error: 'Account is required when not using cash' };
  }

  if (!data.isCash && data.accountId) {
    const account = await assertAccountOwnership(user._id, data.accountId);
    if (!account) return { error: 'Invalid account' };
  }

  return null;
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, TRANSACTION_FIELDS);

    const validationError = await validateTransactionData(user, data);
    if (validationError) {
      return NextResponse.json({ error: validationError.error }, { status: 400 });
    }

    const transaction = await Transaction.create({
      ...data,
      userId: user._id,
      accountId: data.isCash ? null : data.accountId,
      transferToAccountId: data.transferToIsCash ? null : data.transferToAccountId,
      date: data.date ? new Date(data.date) : new Date(),
    });

    if (!body.skipBalanceUpdate) {
      await applyTransactionBalances(user._id, transaction);
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('categoryId')
      .populate('accountId')
      .populate('transferToAccountId');

    return NextResponse.json(populatedTransaction);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create transaction');
  }
}
