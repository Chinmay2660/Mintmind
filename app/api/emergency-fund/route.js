import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import EmergencyFund from '@/models/EmergencyFund';

const FIELDS = ['currentAmount', 'targetAmount', 'monthlyContribution', 'monthlyExpenses', 'accountId'];

export async function GET() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    let fund = await EmergencyFund.findOne({ userId: user._id });
    if (!fund) {
      fund = await EmergencyFund.create({ userId: user._id, targetAmount: 0, currentAmount: 0 });
    }
    const monthsCovered = fund.monthlyExpenses > 0 ? fund.currentAmount / fund.monthlyExpenses : 0;
    const progress = fund.targetAmount > 0 ? (fund.currentAmount / fund.targetAmount) * 100 : 0;
    return NextResponse.json({ ...fund.toObject(), monthsCovered, progress });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch emergency fund');
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, FIELDS);
    const fund = await EmergencyFund.findOneAndUpdate(
      { userId: user._id },
      data,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    const monthsCovered = fund.monthlyExpenses > 0 ? fund.currentAmount / fund.monthlyExpenses : 0;
    const progress = fund.targetAmount > 0 ? (fund.currentAmount / fund.targetAmount) * 100 : 0;
    return NextResponse.json({ ...fund.toObject(), monthsCovered, progress });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update emergency fund');
  }
}
