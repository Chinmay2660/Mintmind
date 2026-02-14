import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Cash from '@/models/Cash';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    let cash = await Cash.findOne({ userId: user._id });
    if (!cash) {
      cash = await Cash.create({ userId: user._id, amount: 0 });
    }

    return NextResponse.json(cash);
  } catch (error) {
    console.error('Error fetching cash:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();
    let cash = await Cash.findOne({ userId: user._id });
    if (!cash) {
      cash = await Cash.create({ userId: user._id, amount: body.amount || 0 });
    } else {
      cash.amount = body.amount ?? cash.amount;
      await cash.save();
    }

    return NextResponse.json(cash);
  } catch (error) {
    console.error('Error updating cash:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

