import { NextResponse } from 'next/server';
import { requireAuth, rateLimitOrRespond, safeErrorResponse } from '@/lib/middleware/api';
import { searchSchemes } from '@/lib/services/mfapi';

export async function GET(request) {
  const limited = rateLimitOrRespond(request, { name: 'mfapi-search', limit: 30, windowMs: 60_000 });
  if (limited) return limited;
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
