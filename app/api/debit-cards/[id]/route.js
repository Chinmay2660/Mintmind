import { NextResponse } from 'next/server';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import connectDB from '@/lib/mongodb';
import DebitCard, { DEBIT_CARD_FIELDS, normalizeDebitCardInput, ownsDebitableAccount } from '@/models/DebitCard';

const notFound = () => NextResponse.json({ error: 'Debit card not found' }, { status: 404 });

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const card = await DebitCard.findOne({ _id: id, userId: user._id });
    return card ? NextResponse.json(card) : notFound();
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch debit card');
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const { data, error } = normalizeDebitCardInput(pick(await request.json(), DEBIT_CARD_FIELDS));
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (data.accountId !== undefined && !(await ownsDebitableAccount(user._id, data.accountId))) {
      return NextResponse.json({ error: 'Choose one of your bank accounts' }, { status: 400 });
    }

    const card = await DebitCard.findOneAndUpdate(
      { _id: id, userId: user._id },
      data,
      { new: true, runValidators: true }
    );
    return card ? NextResponse.json(card) : notFound();
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update debit card');
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const card = await DebitCard.findOneAndDelete({ _id: id, userId: user._id });
    return card ? NextResponse.json({ message: 'Debit card deleted' }) : notFound();
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete debit card');
  }
}
