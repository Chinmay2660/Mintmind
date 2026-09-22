import { NextResponse } from 'next/server';
import { getReleasedVault } from '@/lib/legacy/release';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    if (!token) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    const data = await getReleasedVault(token);
    if (!data) {
      return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
