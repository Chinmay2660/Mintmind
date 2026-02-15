import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Transaction from '@/models/Transaction';
import BankAccount from '@/models/BankAccount';
import Cash from '@/models/Cash';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const oldTransaction = await Transaction.findOne({ _id: params.id, userId: user._id });
    if (!oldTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Revert old transaction's effect on balance
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
      const account = await BankAccount.findById(oldTransaction.accountId);
      if (account) {
        if (oldTransaction.type === 'income') {
          account.balance -= oldTransaction.amount;
        } else {
          account.balance += oldTransaction.amount;
        }
        await account.save();
      }
    }

    // Validation
    if (body.categoryId === undefined && !oldTransaction.categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    
    if (body.amount !== undefined && body.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    
    if (body.isCash === false && !body.accountId && !oldTransaction.accountId) {
      return NextResponse.json({ error: 'Account is required when not using cash' }, { status: 400 });
    }
    
    // Update transaction
    const updateData = {
      ...body,
      accountId: body.isCash ? null : (body.accountId || oldTransaction.accountId),
      date: body.date ? new Date(body.date) : oldTransaction.date,
    }
    
    const transaction = await Transaction.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      updateData,
      { new: true }
    );

    // Apply new transaction's effect on balance
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
    } else if (body.accountId || transaction.accountId) {
      const account = await BankAccount.findById(transaction.accountId);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transaction = await Transaction.findOne({ _id: params.id, userId: user._id });
    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    // Revert transaction's effect on balance
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
      const account = await BankAccount.findById(transaction.accountId);
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
