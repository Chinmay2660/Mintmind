import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyExpense from '@/models/FamilyExpense';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Update family expense
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
    const existing = await FamilyExpense.findOne({ _id: params.id, familyId: family._id });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const isCreator = existing.createdBy.toString() === user._id.toString();
    if (!isHead && !isCreator) {
      return NextResponse.json({ error: 'You can only edit your own expenses' }, { status: 403 });
    }

    const body = await request.json();
    const expense = await FamilyExpense.findOneAndUpdate(
      { _id: params.id, familyId: family._id },
      { ...body, date: body.date ? new Date(body.date) : undefined },
      { new: true }
    )
      .populate('paidBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('sharedWith.user', 'name email');

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json(expense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Delete family expense
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
    const existing = await FamilyExpense.findOne({ _id: params.id, familyId: family._id });

    if (!existing) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    const isCreator = existing.createdBy.toString() === user._id.toString();
    if (!isHead && !isCreator) {
      return NextResponse.json({ error: 'You can only delete your own expenses' }, { status: 403 });
    }

    const expense = await FamilyExpense.findOneAndDelete({
      _id: params.id,
      familyId: family._id,
    });

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Expense deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

