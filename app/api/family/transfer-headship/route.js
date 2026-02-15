import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Transfer headship to another member
export async function POST(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { newHeadId } = body;

    if (!newHeadId) {
      return NextResponse.json({ error: 'New head ID is required' }, { status: 400 });
    }

    const family = await Family.findOne({
      familyHead: user._id,
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found or you are not the head' }, { status: 404 });
    }

    // Check if new head is a member
    const newHeadMember = family.members.find(
      m => m.user.toString() === newHeadId.toString() && m.status === 'active'
    );

    if (!newHeadMember) {
      return NextResponse.json({ error: 'User is not an active member of this family' }, { status: 400 });
    }

    // Transfer headship
    family.familyHead = newHeadId;
    
    // Update roles
    const newHeadIndex = family.members.findIndex(
      m => m.user.toString() === newHeadId.toString()
    );
    if (newHeadIndex !== -1) {
      family.members[newHeadIndex].role = 'head';
    }

    // Change old head to member
    const oldHeadIndex = family.members.findIndex(
      m => m.user.toString() === user._id.toString()
    );
    if (oldHeadIndex !== -1) {
      family.members[oldHeadIndex].role = 'member';
    }

    await family.save();

    const populatedFamily = await Family.findById(family._id)
      .populate('familyHead', 'name email image')
      .populate('members.user', 'name email image');

    return NextResponse.json({
      message: 'Headship transferred successfully',
      family: populatedFamily,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

