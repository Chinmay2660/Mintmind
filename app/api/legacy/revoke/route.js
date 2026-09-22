import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { revokeRelease } from '@/lib/legacy/release';

export async function POST() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const plan = await revokeRelease(user._id);
    const safe = plan.toObject();
    delete safe.accessToken;
    return NextResponse.json(safe);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to revoke release');
  }
}
