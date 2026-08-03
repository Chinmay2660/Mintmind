import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import { ensureCreditCardAccount } from '@/lib/api/creditCardAccount';
import CreditCard from '@/models/CreditCard';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const CREDIT_CARD_FIELDS = [
  'cardName', 'issuer', 'cardNumber', 'cardType', 'lastFourDigits', 'creditLimit',
  'currentBalance', 'statementDay', 'dueDay', 'apr', 'rewardsProgram', 'accountId', 'notes',
  'color',
];

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const cards = await CreditCard.find({ userId: user._id })
      .populate('accountId')
      .sort({ cardName: 1 });

    return NextResponse.json(cards);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch credit cards');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, CREDIT_CARD_FIELDS);

    const card = await CreditCard.create({
      ...data,
      userId: user._id,
    });

    await ensureCreditCardAccount(user._id, card);

    const populated = await CreditCard.findById(card._id).populate('accountId');
    return NextResponse.json(populated);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create credit card');
  }
}
