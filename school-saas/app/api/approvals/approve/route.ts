import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';
import { approveUser } from '@/lib/auth/userApproval';

/**
 * POST /api/approvals/approve
 *
 * Approve a pending user request.
 *
 * Rules:
 * - SuperAdmin can approve any user (any role, any school)
 * - Admin can approve only users from their own school
 * - Admin cannot approve other ADMIN role users
 *
 * @body { userId: string }
 */

const approveSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

export async function POST(request: NextRequest) {
  try {
    // Step 1: Verify authentication
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Please sign in to continue' },
        { status: 401 }
      );
    }

    // Step 2: Get current approver
    const approver = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        email: true,
      },
    });

    if (!approver) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Approver not found' },
        { status: 404 }
      );
    }

    // Step 3: Verify approver has required role
    if (![Role.ADMIN, Role.SUPER_ADMIN].includes(approver.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can approve users' },
        { status: 403 }
      );
    }

    // Step 4: Parse and validate request body
    const body = await request.json();
    const validation = approveSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation Error',
          message: 'Invalid request data',
          details: validation.error.format(),
        },
        { status: 400 }
      );
    }

    const { userId } = validation.data;

    // Step 5: Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        status: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'Not Found', message: 'User not found' },
        { status: 404 }
      );
    }

    // Step 6: Verify user is pending
    if (targetUser.status !== UserStatus.PENDING) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `User is not pending. Current status: ${targetUser.status}`,
        },
        { status: 400 }
      );
    }

    // Step 7: Apply approval rules based on approver role
    if (approver.role === Role.ADMIN) {
      // Admin can only approve users from their own school
      if (targetUser.schoolId !== approver.schoolId) {
        // Log unauthorized attempt
        await prisma.auditLog.create({
          data: {
            action: 'APPROVAL_UNAUTHORIZED',
            entityType: 'USER',
            entityId: targetUser.id,
            userId: approver.id,
            details: {
              approverRole: approver.role,
              approverSchoolId: approver.schoolId,
              targetUserSchoolId: targetUser.schoolId,
              targetUserRole: targetUser.role,
              reason: 'Cross-school approval attempt',
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You can only approve users from your own school',
          },
          { status: 403 }
        );
      }

      // Admin cannot approve other ADMIN role users
      if (targetUser.role === Role.ADMIN) {
        // Log unauthorized attempt
        await prisma.auditLog.create({
          data: {
            action: 'APPROVAL_UNAUTHORIZED',
            entityType: 'USER',
            entityId: targetUser.id,
            userId: approver.id,
            details: {
              approverRole: approver.role,
              targetUserRole: targetUser.role,
              reason: 'Admin cannot approve other admins',
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You cannot approve users with ADMIN role',
          },
          { status: 403 }
        );
      }
    }

    // Step 8: Approve the user
    const result = await approveUser(
      targetUser.id,
      approver.id,
      approver.role,
      approver.schoolId
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Approval Failed', message: result.error },
        { status: 500 }
      );
    }

    // Step 9: Return success response
    return NextResponse.json({
      success: true,
      message: 'User approved successfully',
      data: {
        userId: targetUser.id,
        email: targetUser.email,
        name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim(),
        role: targetUser.role,
        approvedAt: result.approvedAt,
        approvedBy: {
          id: approver.id,
          role: approver.role,
        },
      },
    });
  } catch (error) {
    console.error('Approval API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process approval',
      },
      { status: 500 }
    );
  }
}
