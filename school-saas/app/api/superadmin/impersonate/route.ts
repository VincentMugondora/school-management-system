import { NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db';
import { headers } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Validate current user is SUPER_ADMIN
    const admin = await prisma.user.findUnique({
      where: { clerkId },
      select: { id: true, role: true },
    });

    if (!admin || admin.role !== Role.SUPER_ADMIN) {
      return NextResponse.json(
        { error: 'Forbidden - SUPER_ADMIN required' },
        { status: 403 }
      );
    }

    // Parse and validate payload
    const body = await req.json();
    const { schoolId } = body;

    if (!schoolId || typeof schoolId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request - schoolId required' },
        { status: 400 }
      );
    }

    // Validate school exists
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true },
    });

    if (!school) {
      return NextResponse.json(
        { error: 'School not found' },
        { status: 404 }
      );
    }

    // Check for existing active impersonation session
    const existingSession = await prisma.impersonationSession.findFirst({
      where: {
        adminId: admin.id,
        endedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'Active impersonation session exists. End it first.' },
        { status: 409 }
      );
    }

    // Get request metadata for audit
    const headersList = await headers();
    const ipAddress = headersList.get('x-forwarded-for') || 'unknown';
    const userAgent = headersList.get('user-agent') || 'unknown';

    // Create impersonation session (school-level, no specific target user)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 4);

    const session = await prisma.impersonationSession.create({
      data: {
        adminId: admin.id,
        targetUserId: admin.id, // Self-reference for school-level impersonation
        startedAt: new Date(),
        expiresAt,
        ipAddress,
        userAgent,
      },
    });

    // Log audit event
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'SCHOOL_IMPERSONATION_START',
        entity: 'School',
        entityId: school.id,
        details: JSON.stringify({
          sessionId: session.id,
          schoolId: school.id,
          schoolName: school.name,
          userAgent,
        }),
        ipAddress,
      },
    });

    // Store impersonation context in Clerk privateMetadata
    await clerkClient.users.updateUser(clerkId, {
      privateMetadata: {
        impersonation: {
          sessionId: session.id,
          targetUserId: admin.id,
          targetRole: Role.ADMIN, // Simulate ADMIN role for school context
          targetSchoolId: school.id,
          schoolName: school.name,
          startedAt: new Date().toISOString(),
          isImpersonating: true,
          isSchoolContext: true, // Flag to indicate school-level impersonation
        },
      },
    });

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      school: {
        id: school.id,
        name: school.name,
      },
      expiresAt: expiresAt.toISOString(),
    });

  } catch (error) {
    console.error('Error starting school impersonation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
