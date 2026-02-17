import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    
    if (!clerkId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { targetSchoolId } = await req.json();

    // Update current user to target school
    const updatedUser = await prisma.user.update({
      where: { clerkId },
      data: { schoolId: targetSchoolId },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        school: { select: { name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: `User now associated with ${updatedUser.school?.name}`,
    });
  } catch (error) {
    console.error('Error switching school:', error);
    return NextResponse.json(
      { error: 'Failed to switch school', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
