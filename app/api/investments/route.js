import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import Investment from '@/models/Investment';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const INVESTMENT_FIELDS = [
  'name', 'type', 'amount', 'currentValue', 'accountId',
  'investedDate', 'maturityDate', 'maturityType', 'interestRate', 'notes',
];

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const query = { userId: user._id };
    if (type) {
      query.type = type;
    }

    const investments = await Investment.find(query)
      .populate('accountId')
      .sort({ investedDate: -1 });

    return NextResponse.json(investments);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch investments');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, INVESTMENT_FIELDS);

    const investment = await Investment.create({
      ...data,
      userId: user._id,
      investedDate: data.investedDate ? new Date(data.investedDate) : new Date(),
      maturityDate: data.maturityDate ? new Date(data.maturityDate) : null,
    });

    const populatedInvestment = await Investment.findById(investment._id)
      .populate('accountId');

    return NextResponse.json(populatedInvestment);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create investment');
  }
}
