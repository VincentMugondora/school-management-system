import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Get current impersonation context from Clerk metadata
    const client = await clerkClient();
    const user = await client.users.getUser(clerkId);
    const impersonation = user.privateMetadata?.impersonation as {
      sessionId: string;
      isImpersonating: boolean;
    } | undefined;

    // If no active impersonation, just redirect (idempotent)
    if (!impersonation?.isImpersonating) {
      return NextResponse.redirect(new URL('/dashboard/superadmin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
    }

    // Get request metadata for audit
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // End impersonation session in database
    const session = await prisma.impersonationSession.findUnique({
      where: { id: impersonation.sessionId },
    });

    if (session && !session.endedAt) {
      await prisma.impersonationSession.update({
        where: { id: session.id },
        data: { endedAt: new Date() },
      });

      // Log audit event
      await prisma.auditLog.create({
        data: {
          userId: session.adminId,
          action: 'IMPERSONATION_EXIT',
          entity: 'ImpersonationSession',
          entityId: session.id,
          details: JSON.stringify({
            targetUserId: session.targetUserId,
            userAgent,
          }),
          ipAddress,
        },
      });
    }

    // Clear impersonation context from Clerk privateMetadata
    await client.users.updateUser(clerkId, {
      privateMetadata: {
        impersonation: null,
      },
    });

    // Redirect to superadmin dashboard
    return NextResponse.redirect(new URL('/dashboard/superadmin', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));

  } catch (error) {
    console.error('Error exiting impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
