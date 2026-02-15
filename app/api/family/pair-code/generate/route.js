import { getAuthenticatedUser } from '@/lib/middleware/auth';
import PairCode from '@/models/PairCode';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { generatePairCode } from '@/lib/utils/pair-code';

export async function POST(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { email } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 });
    }

    // Invalidate any existing unused codes for this user
    await PairCode.updateMany(
      { userId: user._id, used: false, expiresAt: { $gt: new Date() } },
      { used: true }
    );

    // Generate new pair code
    let code;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      code = generatePairCode();
      const existing = await PairCode.findOne({ code, used: false, expiresAt: { $gt: new Date() } });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json({ error: 'Failed to generate unique code. Please try again.' }, { status: 500 });
    }

    // Create pair code (valid for 60 seconds)
    // Ensure code is stored as string
    const expiresAt = new Date(Date.now() + 60 * 1000);
    const pairCode = await PairCode.create({
      code: String(code), // Ensure it's stored as string
      userId: user._id,
      email: email.toLowerCase().trim(),
      expiresAt,
    });

    return NextResponse.json({
      code: pairCode.code,
      expiresAt: pairCode.expiresAt,
      expiresIn: 60,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

