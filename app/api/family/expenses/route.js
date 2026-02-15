import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import FamilyExpense from '@/models/FamilyExpense';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Get family expenses
export async function GET(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    const family = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (!family) {
      return NextResponse.json({ error: 'Not part of a family' }, { status: 404 });
    }

    const expenses = await FamilyExpense.find({ familyId: family._id })
      .populate('paidBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('sharedWith.user', 'name email')
      .sort({ date: -1 })
      .limit(limit);

    return NextResponse.json(expenses);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create family expense
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

    const body = await request.json();
    const expense = await FamilyExpense.create({
      ...body,
      familyId: family._id,
      paidBy: body.paidBy || user._id,
      createdBy: user._id,
      date: body.date ? new Date(body.date) : new Date(),
    });

    const populatedExpense = await FamilyExpense.findById(expense._id)
      .populate('paidBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('sharedWith.user', 'name email');

    return NextResponse.json(populatedExpense);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

