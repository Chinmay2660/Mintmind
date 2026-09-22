import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import Goal from '@/models/Goal';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const GOAL_FIELDS = ['title', 'description', 'targetAmount', 'currentAmount', 'targetDate', 'category', 'status', 'monthlyContribution', 'expectedReturn', 'investmentIds'];

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const goal = await Goal.findOne({ _id: id, userId: user._id });
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
    return NextResponse.json({ ...goal.toObject(), progress });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch goal');
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, GOAL_FIELDS);
    const goal = await Goal.findOneAndUpdate({ _id: id, userId: user._id }, data, { new: true });
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(goal);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update goal');
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const goal = await Goal.findOneAndDelete({ _id: id, userId: user._id });
    if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ message: 'Deleted' });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to delete goal');
  }
}
