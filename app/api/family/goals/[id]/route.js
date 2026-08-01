import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyGoal from '@/models/FamilyGoal';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Update family goal
export async function PUT(request, { params }) {
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
    const body = await request.json();

    const updates = isHead
      ? body
      : { currentAmount: body.currentAmount };

    if (!isHead && body.currentAmount == null) {
      return NextResponse.json({ error: 'Only family head can update goal details' }, { status: 403 });
    }

    const goal = await FamilyGoal.findOneAndUpdate(
      { _id: params.id, familyId: family._id },
      updates,
      { new: true }
    ).populate('createdBy', 'name email');

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json(goal);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete family goal
export async function DELETE(request, { params }) {
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
      return NextResponse.json({ error: 'Only family head can delete goals' }, { status: 403 });
    }

    const goal = await FamilyGoal.findOneAndDelete({
      _id: params.id,
      familyId: family._id,
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Goal deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

