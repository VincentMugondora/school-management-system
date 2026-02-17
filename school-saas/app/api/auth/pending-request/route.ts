import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { UserStatus } from '@prisma/client';

/**
 * GET /api/auth/pending-request
 *
 * Returns the current user's pending access request status.
 * Used by the waiting-approval page for polling.
 */
export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Find the user with their pending request
    const user = await prisma.user.findFirst({
      where: {
        clerkId,
        status: {
          in: [UserStatus.PENDING, UserStatus.REJECTED],
        },
      },
      include: {
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'No pending request found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: user.id,
      role: user.role,
      school: user.school,
      requestedAt: user.createdAt,
      status: user.status,
    });
  } catch (error) {
    console.error('[PendingRequest API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
