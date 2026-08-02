import {
  requireAuth,
  pick,
  assertAccountOwnership,
  assertCategoryOwnership,
  safeErrorResponse,
} from '@/lib/middleware/api';
import { applyTransactionBalances, reverseTransactionBalances } from '@/lib/api/transactionBalance';
import Transaction from '@/models/Transaction';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const TRANSACTION_FIELDS = [
  'type', 'amount', 'categoryId', 'accountId', 'isCash',
  'description', 'date', 'transferToAccountId', 'transferToIsCash',
];

async function validateTransactionData(user, data, oldTransaction = null) {
  const type = data.type ?? oldTransaction?.type;
  const amount = data.amount ?? oldTransaction?.amount;
  const isCash = data.isCash ?? oldTransaction?.isCash;
  const accountId = isCash ? null : (data.accountId ?? oldTransaction?.accountId);
  const transferToIsCash = data.transferToIsCash ?? oldTransaction?.transferToIsCash;
  const transferToAccountId = transferToIsCash
    ? null
    : (data.transferToAccountId ?? oldTransaction?.transferToAccountId);
  const categoryId = data.categoryId ?? oldTransaction?.categoryId;

  if (!amount || amount <= 0) {
    return { error: 'Amount must be greater than 0' };
  }

  if (type === 'transfer') {
    const hasFrom = isCash || accountId;
    const hasTo = transferToIsCash || transferToAccountId;
    if (!hasFrom || !hasTo) {
      return { error: 'Both source and destination accounts are required for transfers' };
    }
    if (!isCash && accountId) {
      const account = await assertAccountOwnership(user._id, accountId);
      if (!account) return { error: 'Invalid source account' };
    }
    if (!transferToIsCash && transferToAccountId) {
      const account = await assertAccountOwnership(user._id, transferToAccountId);
      if (!account) return { error: 'Invalid destination account' };
    }
    return null;
  }

  if (!categoryId) return { error: 'Category is required' };

  const category = await assertCategoryOwnership(user._id, categoryId);
  if (!category) return { error: 'Invalid category' };

  if (!isCash && !accountId) {
    return { error: 'Account is required when not using cash' };
  }

  if (!isCash && accountId) {
    const account = await assertAccountOwnership(user._id, accountId);
    if (!account) return { error: 'Invalid account' };
  }

  return null;
}

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

    await reverseTransactionBalances(user._id, oldTransaction);

    const validationError = await validateTransactionData(user, data, oldTransaction);
    if (validationError) {
      await applyTransactionBalances(user._id, oldTransaction);
      return NextResponse.json({ error: validationError.error }, { status: 400 });
    }

    const isCash = data.isCash ?? oldTransaction.isCash;
    const transferToIsCash = data.transferToIsCash ?? oldTransaction.transferToIsCash;

    const updateData = {
      ...data,
      amount: data.amount ?? oldTransaction.amount,
      isCash,
      categoryId: data.categoryId ?? oldTransaction.categoryId,
      accountId: isCash ? null : (data.accountId || oldTransaction.accountId),
      transferToAccountId: transferToIsCash
        ? null
        : (data.transferToAccountId || oldTransaction.transferToAccountId),
      transferToIsCash,
      date: data.date ? new Date(data.date) : oldTransaction.date,
    };

    const transaction = await Transaction.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      updateData,
      { new: true }
    );

    await applyTransactionBalances(user._id, transaction);

    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('categoryId')
      .populate('accountId')
      .populate('transferToAccountId');

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

    await reverseTransactionBalances(user._id, transaction);
    await Transaction.findByIdAndDelete(params.id);
    return NextResponse.json({ message: 'Transaction deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete transaction');
  }
}
