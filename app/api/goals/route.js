import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import Goal from '@/models/Goal';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requiredMonthlySaving, projectedValue } from '@/lib/utils/planners';

const GOAL_FIELDS = ['title', 'description', 'targetAmount', 'currentAmount', 'targetDate', 'category', 'status', 'monthlyContribution', 'expectedReturn', 'investmentIds'];

export async function GET() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const goals = await Goal.find({ userId: user._id, status: { $ne: 'cancelled' } })
      .populate('familyGoalId', 'title familyId')
      .sort({ createdAt: -1 });

    const enriched = goals.map((g) => {
      const progress = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
      const requiredMonthly = requiredMonthlySaving({
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate,
        expectedReturn: g.expectedReturn || 8,
      });
      const shortfall = Math.max(0, g.targetAmount - g.currentAmount);
      return { ...g.toObject(), progress, requiredMonthly, shortfall };
    });

    return NextResponse.json(enriched);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch goals');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, GOAL_FIELDS);
    if (!data.title || !data.targetAmount) {
      return NextResponse.json({ error: 'Title and target amount are required' }, { status: 400 });
    }

    const goal = await Goal.create({ ...data, userId: user._id });
    return NextResponse.json(goal);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create goal');
  }
}
