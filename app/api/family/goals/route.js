import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyGoal from '@/models/FamilyGoal';
import {
  resolveMemberSplits,
  syncPersonalGoalsFromFamilyGoal,
} from '@/lib/utils/familyGoals';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Get family goals
export async function GET(request) {
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

    const goals = await FamilyGoal.find({ familyId: family._id })
      .populate('createdBy', 'name email')
      .populate('memberSplits.user', 'name email image')
      .sort({ createdAt: -1 });

    return NextResponse.json(goals);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create family goal
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
      return NextResponse.json({ error: 'Only family head can create goals' }, { status: 403 });
    }

    const body = await request.json();
    const memberSplits = resolveMemberSplits(family, body.targetAmount, body.splitPercentages);

    const goal = await FamilyGoal.create({
      title: body.title,
      description: body.description,
      targetAmount: body.targetAmount,
      currentAmount: body.currentAmount || 0,
      targetDate: body.targetDate || undefined,
      category: body.category || 'savings',
      familyId: family._id,
      createdBy: user._id,
      memberSplits,
    });

    await syncPersonalGoalsFromFamilyGoal(goal);

    const populatedGoal = await FamilyGoal.findById(goal._id)
      .populate('createdBy', 'name email')
      .populate('memberSplits.user', 'name email image');

    return NextResponse.json(populatedGoal);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
