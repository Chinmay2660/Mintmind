import { requireAuth, sanitizeUser, safeErrorResponse } from '@/lib/middleware/api';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { user, response } = await requireAuth();
    if (response) return response;

    return NextResponse.json(sanitizeUser(user));
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch user');
  }
}
