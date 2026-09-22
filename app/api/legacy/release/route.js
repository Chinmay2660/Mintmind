import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { manualRelease } from '@/lib/legacy/release';

export async function POST() {
  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const { plan, accessToken, notification } = await manualRelease(user._id);
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return NextResponse.json({
      released: true,
      releasedAt: plan.releasedAt,
      accessUrl: `${baseUrl}/legacy/${accessToken}`,
      accessToken,
      emailSent: notification?.emailSent ?? false,
    });
  } catch (error) {
    return safeErrorResponse(error, error.message || 'Failed to release vault');
  }
}
