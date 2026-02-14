import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Investment from '@/models/Investment';
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

    const query = { userId: user._id };
    if (type) {
      query.type = type;
    }

    const investments = await Investment.find(query)
      .populate('accountId')
      .sort({ investedDate: -1 });

    return NextResponse.json(investments);
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
    const investment = await Investment.create({
      ...body,
      userId: user._id,
      investedDate: body.investedDate ? new Date(body.investedDate) : new Date(),
      maturityDate: body.maturityDate ? new Date(body.maturityDate) : null,
    });

    const populatedInvestment = await Investment.findById(investment._id)
      .populate('accountId');

    return NextResponse.json(populatedInvestment);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
