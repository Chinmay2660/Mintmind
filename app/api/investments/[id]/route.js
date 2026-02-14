import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Investment from '@/models/Investment';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function PUT(request, { params }) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const updateData = { ...body };
    if (body.investedDate) {
      updateData.investedDate = new Date(body.investedDate);
    }
    if (body.maturityDate) {
      updateData.maturityDate = new Date(body.maturityDate);
    }

    const investment = await Investment.findOneAndUpdate(
      { _id: params.id, userId: user._id },
      updateData,
      { new: true }
    );

    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    const populatedInvestment = await Investment.findById(investment._id)
      .populate('accountId');

    return NextResponse.json(populatedInvestment);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const investment = await Investment.findOneAndDelete({ _id: params.id, userId: user._id });
    if (!investment) {
      return NextResponse.json({ error: 'Investment not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Investment deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
