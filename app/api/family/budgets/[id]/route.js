import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyBudget from '@/models/FamilyBudget';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Update family budget
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
    if (!isHead) {
      return NextResponse.json({ error: 'Only family head can update budgets' }, { status: 403 });
    }

    const body = await request.json();
    const budget = await FamilyBudget.findOneAndUpdate(
      { _id: params.id, familyId: family._id },
      body,
      { new: true }
    ).populate('createdBy', 'name email');

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json(budget);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete family budget
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
      return NextResponse.json({ error: 'Only family head can delete budgets' }, { status: 403 });
    }

    const budget = await FamilyBudget.findOneAndDelete({
      _id: params.id,
      familyId: family._id,
    });

    if (!budget) {
      return NextResponse.json({ error: 'Budget not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Budget deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

