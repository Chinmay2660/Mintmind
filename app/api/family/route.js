import { getAuthenticatedUser } from '@/lib/middleware/auth';
import Family from '@/models/Family';
import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

// Get user's family
export async function GET(request) {
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
    })
      .populate('familyHead', 'name email image')
      .populate('members.user', 'name email image');

    if (!family) {
      return NextResponse.json({ family: null });
    }

    // Filter out removed members from the response
    const activeMembers = family.members.filter(m => m.status === 'active');
    
    // Check if user is actually the head (handle both populated and non-populated)
    const headId = family.familyHead?._id || family.familyHead;
    const isHead = headId && (
      headId.toString() === user._id.toString()
    );
    
    // Check if user is an active member
    const isActiveMember = activeMembers.some(
      m => {
        const memberUserId = m.user?._id || m.user;
        return memberUserId && memberUserId.toString() === user._id.toString();
      }
    );

    // If user is not the head and not an active member, they're not part of the family
    if (!isHead && !isActiveMember) {
      return NextResponse.json({ family: null });
    }

    // If user is head but has no active members (orphaned family), return null
    if (isHead && activeMembers.length === 0) {
      // Clean up orphaned family
      await Family.findByIdAndDelete(family._id);
      return NextResponse.json({ family: null });
    }

    // Return family with only active members
    const familyData = family.toObject();
    familyData.members = activeMembers;
    
    return NextResponse.json({ family: familyData });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Create a new family
export async function POST(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is already in a family (as head or active member)
    const existingFamily = await Family.findOne({
      $or: [
        { familyHead: user._id },
        { 
          'members.user': user._id, 
          'members.status': 'active' 
        },
      ],
    });

    if (existingFamily) {
      // Double-check: if user is head but has no active members, allow creating new family
      // This handles edge cases where family wasn't properly deleted
      if (existingFamily.familyHead.toString() === user._id.toString()) {
        const activeMembers = existingFamily.members.filter(
          m => m.status === 'active' && m.user.toString() !== user._id.toString()
        );
        // If no other active members, delete the old family and allow creating new one
        if (activeMembers.length === 0) {
          await Family.findByIdAndDelete(existingFamily._id);
        } else {
          return NextResponse.json({ 
            error: 'You are already part of a family. Leave your current family first.' 
          }, { status: 400 });
        }
      } else {
        // User is an active member (not head)
        return NextResponse.json({ 
          error: 'You are already part of a family. Leave your current family first.' 
        }, { status: 400 });
      }
    }

    const body = await request.json();
    const { name } = body;

    const family = await Family.create({
      name: name || `${user.name || user.email}'s Family`,
      familyHead: user._id,
      members: [{
        user: user._id,
        role: 'head',
        status: 'active',
      }],
    });

    const populatedFamily = await Family.findById(family._id)
      .populate('familyHead', 'name email image')
      .populate('members.user', 'name email image');

    return NextResponse.json({ family: populatedFamily });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Update family settings
export async function PUT(request) {
  try {
    await connectDB();
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
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
      return NextResponse.json({ error: 'Only family head can update settings' }, { status: 403 });
    }

    // Update family
    if (body.name) {
      family.name = body.name;
    }
    if (body.settings) {
      family.settings = { ...family.settings, ...body.settings };
    }

    await family.save();

    const populatedFamily = await Family.findById(family._id)
      .populate('familyHead', 'name email image')
      .populate('members.user', 'name email image');

    return NextResponse.json({ family: populatedFamily });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

