import { getAuthenticatedUser } from '@/lib/middleware/auth';
import BankAccount, { BANK_ACCOUNT_FIELDS, normalizeBankAccountInput } from '@/models/BankAccount';
import DebitCard from '@/models/DebitCard';
import { pick } from '@/lib/middleware/api';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await BankAccount.findOne({ _id: id, userId: user._id });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = normalizeBankAccountInput(pick(await request.json(), BANK_ACCOUNT_FIELDS));
    if (error) return NextResponse.json({ error }, { status: 400 });

    const account = await BankAccount.findOneAndUpdate(
      { _id: id, userId: user._id },
      data,
      { new: true, runValidators: true }
    );

    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json(account);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const account = await BankAccount.findOneAndDelete({ _id: id, userId: user._id });
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }
    await DebitCard.deleteMany({ userId: user._id, accountId: account._id });

    return NextResponse.json({ message: 'Account deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
