import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Insurance from '@/models/Insurance';
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

    const policy = await Insurance.findOne({ _id: id, userId: user._id }).populate('accountId');
    if (!policy) {
      return NextResponse.json({ error: 'Insurance policy not found' }, { status: 404 });
    }

    return NextResponse.json(policy);
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
    const updateData = { ...body };
    if (body.startDate) updateData.startDate = new Date(body.startDate);
    if (body.renewalDate) updateData.renewalDate = new Date(body.renewalDate);
    if (body.endDate) updateData.endDate = new Date(body.endDate);

    const policy = await Insurance.findOneAndUpdate(
      { _id: id, userId: user._id },
      updateData,
      { new: true }
    );

    if (!policy) {
      return NextResponse.json({ error: 'Insurance policy not found' }, { status: 404 });
    }

    const populated = await Insurance.findById(policy._id).populate('accountId');
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

    const policy = await Insurance.findOneAndDelete({ _id: id, userId: user._id });
    if (!policy) {
      return NextResponse.json({ error: 'Insurance policy not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Insurance policy deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
