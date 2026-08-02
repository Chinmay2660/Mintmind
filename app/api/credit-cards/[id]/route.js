import { getAuthenticatedUser } from '@/lib/middleware/auth';
import CreditCard from '@/models/CreditCard';
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

    const body = await request.json();
    const card = await CreditCard.findOneAndUpdate(
      { _id: id, userId: user._id },
      body,
      { new: true }
    );

    if (!card) {
      return NextResponse.json({ error: 'Credit card not found' }, { status: 404 });
    }

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

    return NextResponse.json({ message: 'Credit card deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
