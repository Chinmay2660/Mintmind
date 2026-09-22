import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, pick, safeErrorResponse } from '@/lib/middleware/api';
import { getOrCreateLegacyPlan, recordActivity } from '@/lib/legacy/release';

const FIELDS = ['enabled', 'releaseMode', 'inactivityDays', 'accessScopes'];

export async function GET() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const plan = await recordActivity(user._id);
    const safe = plan.toObject();
    delete safe.accessToken;
    return NextResponse.json(safe);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch legacy plan');
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;
    const body = await request.json();
    const data = pick(body, FIELDS);

    if (data.inactivityDays != null) {
      const days = Number(data.inactivityDays);
      if (days < 30 || days > 365) {
        return NextResponse.json({ error: 'Inactivity period must be between 30 and 365 days' }, { status: 400 });
      }
      data.inactivityDays = days;
    }

    const plan = await getOrCreateLegacyPlan(user._id);
    Object.assign(plan, data);
    plan.lastActiveAt = new Date();
    await plan.save();

    const safe = plan.toObject();
    delete safe.accessToken;
    return NextResponse.json(safe);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to update legacy plan');
  }
}
