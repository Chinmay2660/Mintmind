import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyGoal from '@/models/FamilyGoal';
import Goal from '@/models/Goal';
import {
  applyContribution,
  deletePersonalGoalsForFamilyGoal,
  resolveMemberSplits,
  syncPersonalGoalsFromFamilyGoal,
} from '@/lib/utils/familyGoals';
import { buildMemberSplits } from '@/lib/utils/goalSplits';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Update family goal
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
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

    const goal = await FamilyGoal.findOne({ _id: id, familyId: family._id });
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    // Member contribution: increment their split only
    if (body.contributeAmount != null) {
      const amount = Number(body.contributeAmount);
      if (!amount || amount <= 0) {
        return NextResponse.json({ error: 'Enter a valid contribution amount' }, { status: 400 });
      }

      applyContribution(goal, user._id, amount);
      await goal.save();
      await syncPersonalGoalsFromFamilyGoal(goal);

      const populated = await FamilyGoal.findById(goal._id)
        .populate('createdBy', 'name email')
        .populate('memberSplits.user', 'name email image');
      return NextResponse.json(populated);
    }

    if (!isHead) {
      return NextResponse.json({ error: 'Only family head can update goal details' }, { status: 403 });
    }

    // Head full update
    if (body.title != null) goal.title = body.title;
    if (body.description != null) goal.description = body.description;
    if (body.targetAmount != null) goal.targetAmount = body.targetAmount;
    if (body.targetDate !== undefined) goal.targetDate = body.targetDate || undefined;
    if (body.category != null) goal.category = body.category;
    if (body.status != null) goal.status = body.status;

    if (body.splitPercentages && body.targetAmount != null) {
      goal.memberSplits = resolveMemberSplits(family, body.targetAmount, body.splitPercentages);
    } else if (body.splitPercentages) {
      const memberIds = (goal.memberSplits || []).map((s) => (s.user._id ?? s.user).toString());
      goal.memberSplits = buildMemberSplits(memberIds, body.splitPercentages, goal.targetAmount);
    } else if (body.targetAmount != null && goal.memberSplits?.length) {
      const percentages = goal.memberSplits.map((s) => s.percentage);
      const memberIds = goal.memberSplits.map((s) => (s.user._id ?? s.user).toString());
      const currentByUser = Object.fromEntries(
        goal.memberSplits.map((s) => [(s.user._id ?? s.user).toString(), s.currentAmount || 0])
      );
      goal.memberSplits = buildMemberSplits(memberIds, percentages, body.targetAmount).map((split) => ({
        ...split,
        currentAmount: currentByUser[split.user.toString()] || 0,
      }));
    }

    if (body.currentAmount != null && isHead) {
      goal.currentAmount = body.currentAmount;
    }

    await goal.save();
    await syncPersonalGoalsFromFamilyGoal(goal);

    // Keep personal goal titles in sync after head edit
    if (body.title != null) {
      await Goal.updateMany(
        { familyGoalId: goal._id },
        { title: goal.title, description: goal.description, targetDate: goal.targetDate, category: goal.category, status: goal.status }
      );
    }

    const populatedGoal = await FamilyGoal.findById(goal._id)
      .populate('createdBy', 'name email')
      .populate('memberSplits.user', 'name email image');

    return NextResponse.json(populatedGoal);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete family goal
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
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
      _id: id,
      familyId: family._id,
    });

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }

    await deletePersonalGoalsForFamilyGoal(goal._id);

    return NextResponse.json({ message: 'Goal deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
