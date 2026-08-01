import { requireAuth, rateLimitOrRespond, safeErrorResponse } from '@/lib/middleware/api';
import PairCode from '@/models/PairCode';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { generatePairCode } from '@/lib/utils/pair-code';

export async function POST(request) {
  const rateLimited = rateLimitOrRespond(request, {
    name: 'pair-code-generate',
    limit: 5,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited

  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const email = user.email?.toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required on your account' }, { status: 400 });
    }

    await PairCode.updateMany(
      { userId: user._id, used: false, expiresAt: { $gt: new Date() } },
      { used: true }
    );

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

    const expiresAt = new Date(Date.now() + 60 * 1000);
    const pairCode = await PairCode.create({
      code: String(code),
      userId: user._id,
      email,
      expiresAt,
    });

    return NextResponse.json({
      code: pairCode.code,
      expiresAt: pairCode.expiresAt,
      expiresIn: 60,
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to generate pair code');
  }
}
