import { NextResponse } from 'next/server';
import { requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import { fetchSchemeNav, fetchSchemeHistory } from '@/lib/services/mfapi';

export async function GET(request, { params }) {
  try {
    const { schemeCode } = await params;
    const { response } = await requireAuth();
    if (response) return response;

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range');

    if (range) {
      const history = await fetchSchemeHistory(schemeCode, range);
      return NextResponse.json({ schemeCode, history });
    }

    const nav = await fetchSchemeNav(schemeCode);
    return NextResponse.json(nav);
  } catch (error) {
    return safeErrorResponse(error, 'Failed to fetch NAV data');
  }
}
