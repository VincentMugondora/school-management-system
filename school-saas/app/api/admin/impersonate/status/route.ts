import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId: clerkId, sessionClaims } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Read impersonation context from Clerk session claims
    const impersonation = sessionClaims?.impersonation as {
      isImpersonating: boolean;
      sessionId: string;
      targetUserId: string;
      targetRole: string;
      schoolName: string;
      isSchoolContext: boolean;
    } | undefined;

    if (!impersonation?.isImpersonating) {
      return NextResponse.json({
        isImpersonating: false,
      });
    }

    return NextResponse.json({
      isImpersonating: true,
      sessionId: impersonation.sessionId,
      targetUserId: impersonation.targetUserId,
      targetRole: impersonation.targetRole,
      schoolName: impersonation.schoolName,
      isSchoolContext: impersonation.isSchoolContext,
    });
  } catch (error) {
    console.error('Error checking impersonation status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
