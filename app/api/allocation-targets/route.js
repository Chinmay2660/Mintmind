import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import AllocationTarget from '@/models/AllocationTarget';
import Investment from '@/models/Investment';

const FIELDS = ['equity', 'debt', 'gold', 'cash', 'other'];

export async function GET() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    let target = await AllocationTarget.findOne({ userId: user._id });
    if (!target) {
      target = await AllocationTarget.create({ userId: user._id });
    }
    const investments = await Investment.find({ userId: user._id });
    const total = investments.reduce((s, i) => s + (i.currentValue || i.amount || 0), 0);
    const current = { equity: 0, debt: 0, gold: 0, cash: 0, other: 0 };
    for (const inv of investments) {
      const val = inv.currentValue || inv.amount || 0;
      const cls = inv.assetClass || 'other';
      current[cls] = (current[cls] || 0) + val;
    }
    const currentPct = {};
    for (const k of Object.keys(current)) {
      currentPct[k] = total > 0 ? (current[k] / total) * 100 : 0;
    }
    return NextResponse.json({ target, current, currentPct, total });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch allocation');
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, FIELDS);
    const target = await AllocationTarget.findOneAndUpdate(
      { userId: user._id },
      data,
      { new: true, upsert: true }
    );
    return NextResponse.json(target);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update allocation targets');
  }
}
