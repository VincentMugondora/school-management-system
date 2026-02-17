import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { UserStatus } from '@prisma/client';

/**
 * POST /api/auth/cancel-request
 *
 * Cancels a pending access request and deletes the user record.
 */
export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the user exists, is pending, and belongs to the current session
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        clerkId,
        status: UserStatus.PENDING,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Pending request not found or already processed' },
        { status: 404 }
      );
    }

    // Create audit log before deletion
    await prisma.auditLog.create({
      data: {
        schoolId: user.schoolId,
        userId,
        action: 'CANCEL_ACCESS_REQUEST',
        entity: 'USER',
        entityId: userId,
        details: `User ${user.email} cancelled their access request`,
      },
    });

    // Delete the user record
    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Access request cancelled successfully',
    });
  } catch (error) {
    console.error('[CancelRequest API] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
