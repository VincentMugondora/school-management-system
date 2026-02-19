import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getImpersonationContext } from '@/lib/auth/impersonation';

export async function GET() {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const context = await getImpersonationContext(clerkId);

    if (!context) {
      return NextResponse.json({
        isImpersonating: false,
      });
    }

    return NextResponse.json({
      isImpersonating: true,
      sessionId: context.sessionId,
      targetUserId: context.targetUserId,
      targetRole: context.targetRole,
    });
  } catch (error) {
    console.error('Error checking impersonation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
