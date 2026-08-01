import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyGoal from '@/models/FamilyGoal';
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
    const goal = await FamilyGoal.create({
      ...body,
      familyId: family._id,
      createdBy: user._id,
      currentAmount: body.currentAmount || 0,
    });

    const populatedGoal = await FamilyGoal.findById(goal._id)
      .populate('createdBy', 'name email');

    return NextResponse.json(populatedGoal);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

