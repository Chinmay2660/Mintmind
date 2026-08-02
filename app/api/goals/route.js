import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Goal from '@/models/Goal';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export async function GET() {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const goals = await Goal.find({ userId: user._id, status: { $ne: 'cancelled' } })
      .populate('familyGoalId', 'title familyId')
      .sort({ createdAt: -1 });

    return NextResponse.json(goals);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
