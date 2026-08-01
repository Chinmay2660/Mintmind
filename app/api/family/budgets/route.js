import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyBudget from '@/models/FamilyBudget';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Get family budgets
export async function GET(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');

    const family = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (!family) {
      return NextResponse.json({ error: 'Not part of a family' }, { status: 404 });
    }

    const query = { familyId: family._id };
    if (period) {
      query.period = period;
    }

    const budgets = await FamilyBudget.find(query)
      .populate('createdBy', 'name email')
      .sort({ startDate: -1 });

    return NextResponse.json(budgets);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create family budget
export async function POST(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const family = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (!family) {
      return NextResponse.json({ error: 'Not part of a family' }, { status: 404 });
    }

    const isHead = family.familyHead.toString() === user._id.toString();
    if (!isHead) {
      return NextResponse.json({ error: 'Only family head can create budgets' }, { status: 403 });
    }

    const body = await request.json();
    const budget = await FamilyBudget.create({
      ...body,
      familyId: family._id,
      createdBy: user._id,
    });

    const populatedBudget = await FamilyBudget.findById(budget._id)
      .populate('createdBy', 'name email');

    return NextResponse.json(populatedBudget);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

