import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Remove member from family
export async function DELETE(request, { params }) {
  try {
    const { id: memberId } = await params;
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

    // Check if user is family head
    const isHead = family.familyHead.toString() === user._id.toString();
    if (!isHead) {
      return NextResponse.json({ error: 'Only family head can remove members' }, { status: 403 });
    }

    // Cannot remove family head
    if (family.familyHead.toString() === memberId) {
      return NextResponse.json({ error: 'Cannot remove family head' }, { status: 400 });
    }

    // Remove member
    const memberIndex = family.members.findIndex(
      m => m.user.toString() === memberId && m.status === 'active'
    );

    if (memberIndex === -1) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    family.members[memberIndex].status = 'removed';
    await family.save();

    const populatedFamily = await Family.findById(family._id)
      .populate('familyHead', 'name email image')
      .populate('members.user', 'name email image');

    return NextResponse.json({ family: populatedFamily });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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

    family.members[memberIndex].status = 'removed';
    await family.save();

    return NextResponse.json({ message: 'Left family successfully' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

