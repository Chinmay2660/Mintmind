import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import Insurance from '@/models/Insurance';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

const INSURANCE_FIELDS = [
  'type', 'name', 'policyNumber', 'premium', 'premiumFrequency',
  'startDate', 'renewalDate', 'coverageAmount', 'accountId', 'isActive', 'notes',
];

export async function GET(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const query = { userId: user._id };
    if (type) query.type = type;

    const policies = await Insurance.find(query)
      .populate('accountId')
      .sort({ renewalDate: 1, startDate: -1 });

    return NextResponse.json(policies);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch insurance policies');
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const data = pick(body, INSURANCE_FIELDS);

    const policy = await Insurance.create({
      ...data,
      userId: user._id,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      renewalDate: data.renewalDate ? new Date(data.renewalDate) : null,
    });

    const populated = await Insurance.findById(policy._id).populate('accountId');
    return NextResponse.json(populated);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to create insurance policy');
  }
}
