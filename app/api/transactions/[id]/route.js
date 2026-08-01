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

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, TRANSACTION_FIELDS);
    const oldTransaction = await Transaction.findOne({ _id: params.id, userId: user._id });
    if (!oldTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (oldTransaction.isCash) {
      const cash = await Cash.findOne({ userId: user._id });
      if (cash) {
        if (oldTransaction.type === 'income') {
          cash.amount -= oldTransaction.amount;
        } else {
          cash.amount += oldTransaction.amount;
        }
        await cash.save();
      }
    } else if (oldTransaction.accountId) {
      const account = await assertAccountOwnership(user._id, oldTransaction.accountId);
      if (account) {
        if (oldTransaction.type === 'income') {
          account.balance -= oldTransaction.amount;
        } else {
          account.balance += oldTransaction.amount;
        }
        await account.save();
      }
    }

    const categoryId = data.categoryId ?? oldTransaction.categoryId;
    if (!categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }

    const category = await assertCategoryOwnership(user._id, categoryId);
    if (!category) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }
    
    const amount = data.amount ?? oldTransaction.amount;
    if (amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }

    const isCash = data.isCash ?? oldTransaction.isCash;
    const accountId = isCash ? null : (data.accountId || oldTransaction.accountId);

    if (!isCash && !accountId) {
      return NextResponse.json({ error: 'Account is required when not using cash' }, { status: 400 });
    }

    if (!isCash && accountId) {
      const account = await assertAccountOwnership(user._id, accountId);
      if (!account) {
        return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
      }
    }
    
    const updateData = {
      ...data,
      amount,
      isCash,
      categoryId,
      accountId,
      date: data.date ? new Date(data.date) : oldTransaction.date,
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      updateData,
      { new: true }
    );

    if (transaction.isCash) {
      const cash = await Cash.findOne({ userId: user._id });
      if (cash) {
        if (transaction.type === 'income') {
          cash.amount += transaction.amount;
        } else {
          cash.amount -= transaction.amount;
        }
        await cash.save();
      }
    } else if (transaction.accountId) {
      const account = await assertAccountOwnership(user._id, transaction.accountId);
      if (account) {
        if (transaction.type === 'income') {
          account.balance += transaction.amount;
        } else {
          account.balance -= transaction.amount;
        }
        await account.save();
      }
    }

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('categoryId')
      .populate('accountId');

    return NextResponse.json(populatedTransaction);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update transaction');
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const transaction = await Transaction.findOne({ _id: params.id, userId: user._id });
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    if (transaction.isCash) {
      const cash = await Cash.findOne({ userId: user._id });
      if (cash) {
        if (transaction.type === 'income') {
          cash.amount -= transaction.amount;
        } else {
          cash.amount += transaction.amount;
        }
        await cash.save();
      }
    } else if (transaction.accountId) {
      const account = await assertAccountOwnership(user._id, transaction.accountId);
      if (account) {
        if (transaction.type === 'income') {
          account.balance -= transaction.amount;
        } else {
          account.balance += transaction.amount;
        }
        await account.save();
      }
    }

    await Transaction.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Transaction deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete transaction');
  }
}
