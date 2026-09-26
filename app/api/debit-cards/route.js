import { NextResponse } from 'next/server';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import connectDB from '@/lib/mongodb';
import DebitCard, { DEBIT_CARD_FIELDS, normalizeDebitCardInput, ownsDebitableAccount } from '@/models/DebitCard';

export async function GET() {
  try {
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const cards = await DebitCard.find({ userId: user._id }).sort({ createdAt: -1 });
    return NextResponse.json(cards);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch debit cards');
  }
}

export async function POST(request) {
  try {
    const { user, response } = await requireAuth();
    if (response) return response;

    await connectDB();
    const { data, error } = normalizeDebitCardInput(pick(await request.json(), DEBIT_CARD_FIELDS));
    if (error) return NextResponse.json({ error }, { status: 400 });
    if (!(await ownsDebitableAccount(user._id, data.accountId))) {
      return NextResponse.json({ error: 'Choose one of your bank accounts' }, { status: 400 });
    }

    const card = await DebitCard.create({ ...data, userId: user._id });
    return NextResponse.json(card);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create debit card');
  }
}
