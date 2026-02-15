import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Transaction from '@/models/Transaction';
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const limit = parseInt(searchParams.get('limit') || '50');

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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    // Validation
    if (!body.categoryId) {
      return NextResponse.json({ error: 'Category is required' }, { status: 400 });
    }
    
    if (!body.amount || body.amount <= 0) {
      return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 });
    }
    
    if (!body.isCash && !body.accountId) {
      return NextResponse.json({ error: 'Account is required when not using cash' }, { status: 400 });
    }
    
    const transaction = await Transaction.create({
      ...body,
      userId: user._id,
      accountId: body.isCash ? null : body.accountId,
      date: body.date ? new Date(body.date) : new Date(),
    });

    // Update account balance or cash
    if (body.isCash) {
      const cash = await Cash.findOne({ userId: user._id });
      if (cash) {
        if (body.type === 'income') {
          cash.amount += body.amount;
        } else {
          cash.amount -= body.amount;
        }
        await cash.save();
      }
    } else if (body.accountId) {
      const account = await BankAccount.findById(body.accountId);
      if (account) {
        if (body.type === 'income') {
          account.balance += body.amount;
        } else {
          account.balance -= body.amount;
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
