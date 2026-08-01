import { rateLimitOrRespond, requireAuth, safeErrorResponse } from '@/lib/middleware/api';
import PairCode from '@/models/PairCode';
import Family from '@/models/Family';
import User from '@/models/User';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { isValidPairCodeFormat } from '@/lib/utils/pair-code';

export async function POST(request) {
  const rateLimited = rateLimitOrRespond(request, {
    name: 'pair-code-verify',
    limit: 10,
    windowMs: 60 * 1000,
  });
  if (rateLimited) return rateLimited

  try {
    await connectDB();
    const { user, response } = await requireAuth();
    if (response) return response;

    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Pair code is required' }, { status: 400 });
    }

    // Ensure code is a string
    const codeString = String(code).trim();

    if (!isValidPairCodeFormat(codeString)) {
      return NextResponse.json({ error: 'Invalid pair code format. Must be 6 digits.' }, { status: 400 });
    }

    // Find the pair code (try both string and number formats)
    const pairCode = await PairCode.findOne({
      code: codeString,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!pairCode) {
      return NextResponse.json({ error: 'Invalid or expired pair code' }, { status: 400 });
    }

    // Check if user is trying to use their own code
    if (pairCode.userId.toString() === user._id.toString()) {
      return NextResponse.json({ error: 'Cannot use your own pair code' }, { status: 400 });
    }

    // Get the code creator's user info
    const codeCreator = await User.findById(pairCode.userId);
    if (!codeCreator) {
      return NextResponse.json({ error: 'Code creator not found' }, { status: 404 });
    }

    // Check if user is already in a family
    const existingFamily = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (existingFamily) {
      return NextResponse.json({ 
        error: 'You are already part of a family. Leave your current family first.' 
      }, { status: 400 });
    }

    // Check if code creator is in a family
    let family = await Family.findOne({
      $or: [
        { familyHead: pairCode.userId },
        { 'members.user': pairCode.userId, 'members.status': 'active' },
      ],
    });

    // If code creator is not in a family, create one
    if (!family) {
      family = await Family.create({
        name: `${codeCreator.name || codeCreator.email}'s Family`,
        familyHead: pairCode.userId,
        members: [{
          user: pairCode.userId,
          role: 'head',
          status: 'active',
        }],
      });
    }

    // Check if user is already a member
    const isMember = family.members.some(
      m => m.user.toString() === user._id.toString() && m.status === 'active'
    );

    if (isMember) {
      // Mark code as used
      pairCode.used = true;
      pairCode.usedBy = user._id;
      pairCode.usedAt = new Date();
      await pairCode.save();

      return NextResponse.json({ 
        message: 'Already a member of this family',
        family: family,
      });
    }

    // Add user as member
    family.members.push({
      user: user._id,
      role: 'member',
      status: 'active',
    });

    await family.save();

    // Mark code as used
    pairCode.used = true;
    pairCode.usedBy = user._id;
    pairCode.usedAt = new Date();
    await pairCode.save();

    // Populate family data
    const populatedFamily = await Family.findById(family._id)
      .populate('familyHead', 'name email image')
      .populate('members.user', 'name email image');

    return NextResponse.json({
      message: 'Successfully joined family',
      family: populatedFamily,
    });
  } catch (error) {
    return safeErrorResponse(error, 'Failed to verify pair code');
  }
}

