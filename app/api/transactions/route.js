import {
  requireAuth,
  pick,
  assertAccountOwnership,
  assertCategoryOwnership,
  safeErrorResponse,
} from '@/lib/middleware/api';
import Transaction from '@/models/Transaction';
import Cash from '@/models/Cash';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const TRANSACTION_FIELDS = ['type', 'amount', 'categoryId', 'accountId', 'isCash', 'description', 'date'];

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const query = { userId: user._id };
    if (type) {
      query.type = type;
    }

    const transactions = await Transaction.find(query)
      .populate('categoryId')
      .populate('accountId')
      .sort({ date: -1 })
      .limit(limit);

    return NextResponse.json(transactions);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch transactions');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, TRANSACTION_FIELDS);
    
    if (!data.categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    
    if (!data.amount || data.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    
    if (!data.isCash && !data.accountId) {
      return NextResponse.json({ error: 'Account is required when not using cash' }, { status: 400 });
    }

    const category = await assertCategoryOwnership(user._id, data.categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    if (!data.isCash && data.accountId) {
      const account = await assertAccountOwnership(user._id, data.accountId);
      if (!account) {
        return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
      }
    }
    
    const transaction = await Transaction.create({
      ...data,
      userId: user._id,
      accountId: data.isCash ? null : data.accountId,
      date: data.date ? new Date(data.date) : new Date(),
    });

    if (data.isCash) {
      const cash = await Cash.findOne({ userId: user._id });
      if (cash) {
        if (data.type === 'income') {
          cash.amount += data.amount;
        } else {
          cash.amount -= data.amount;
        }
        await cash.save();
      }
    } else if (data.accountId) {
      const account = await assertAccountOwnership(user._id, data.accountId);
      if (account) {
        if (data.type === 'income') {
          account.balance += data.amount;
        } else {
          account.balance -= data.amount;
        }
        await account.save();
      }
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('categoryId')
      .populate('accountId');

    return NextResponse.json(populatedTransaction);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create transaction');
  }
}
