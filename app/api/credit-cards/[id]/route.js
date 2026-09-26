import { getAuthenticatedUser } from '@/lib/middleware/auth';
import { ensureCreditCardAccount } from '@/lib/api/creditCardAccount';
import BankAccount from '@/models/BankAccount';
import CreditCard, { CREDIT_CARD_FIELDS } from '@/models/CreditCard';
import { pick } from '@/lib/middleware/api';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const card = await CreditCard.findOne({ _id: id, userId: user._id }).populate('accountId');
    if (!card) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    return NextResponse.json(card);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const card = await CreditCard.findOneAndUpdate(
      { _id: id, userId: user._id },
      pick(await request.json(), CREDIT_CARD_FIELDS),
      { new: true, runValidators: true }
    );

    if (!card) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    await ensureCreditCardAccount(user._id, card);

    const populated = await CreditCard.findById(card._id).populate('accountId');
    return NextResponse.json(populated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const card = await CreditCard.findOneAndDelete({ _id: id, userId: user._id });
    if (!card) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

    if (card.accountId) {
      await BankAccount.findOneAndDelete({ _id: card.accountId, userId: user._id });
    }

    return NextResponse.json({ message: 'Credit card deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
