import { NextResponse } from 'next/server';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { searchSchemes } from '@/lib/services/mfapi';

export async function GET(request) {
  try {
    const { response } = await requireAuth();
    if (response) return response;
    const q = new URL(request.url).searchParams.get('q') || '';
    const results = await searchSchemes(q);
    return NextResponse.json(results);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to search schemes');
  }
}
