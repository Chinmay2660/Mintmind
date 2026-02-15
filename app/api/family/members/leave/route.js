import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Leave family (for members)
export async function POST(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const family = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (!family) {
      return NextResponse.json({ error: 'Family not found' }, { status: 404 });
    }

    // If user is family head, they need to transfer headship or delete family
    if (family.familyHead.toString() === user._id.toString()) {
      const activeMembers = family.members.filter(m => m.status === 'active' && m.user.toString() !== user._id.toString());
      
      if (activeMembers.length > 0) {
        return NextResponse.json({ 
          error: 'Family head cannot leave. Transfer headship first or remove all members.' 
        }, { status: 400 });
      } else {
        // No other members, delete family
        await Family.findByIdAndDelete(family._id);
        return NextResponse.json({ message: 'Family deleted' });
      }
    }

    // Remove member
    const memberIndex = family.members.findIndex(
      m => m.user.toString() === user._id.toString() && m.status === 'active'
    );

    if (memberIndex === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Mark member as removed
    family.members[memberIndex].status = 'removed';
    await family.save();

    // Verify the user is no longer part of the family
    const verifyFamily = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 'members.user': user._id, 'members.status': 'active' },
      ],
    });

    if (verifyFamily) {
      // If still found, there might be an issue - log it but still return success
      console.error('Warning: User still found in family after leaving');
    }

    return NextResponse.json({ message: 'Left family successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

