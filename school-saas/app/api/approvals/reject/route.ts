import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';
import { rejectUser } from '@/src/lib/auth/userApproval';

/**
 * POST /api/approvals/reject
 *
 * Reject a pending user request.
 *
 * Rules:
 * - SuperAdmin can reject any user (any role, any school)
 * - Admin can reject only users from their own school
 * - Admin cannot reject other ADMIN role users
 *
 * @body { userId: string, reason?: string }
 */

const rejectSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  reason: z.string().optional(),
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

    // Step 2: Get current rejector
    const rejector = await prisma.user.findUnique({
      where: { clerkId },
      select: {
        id: true,
        role: true,
        schoolId: true,
        email: true,
      },
    });

    if (!rejector) {
      return NextResponse.json(
        { error: 'Not Found', message: 'Rejector not found' },
        { status: 404 }
      );
    }

    // Step 3: Verify rejector has required role
    if (![Role.ADMIN, Role.SUPER_ADMIN].includes(rejector.role)) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can reject users' },
        { status: 403 }
      );
    }

    // Step 4: Parse and validate request body
    const body = await request.json();
    const validation = rejectSchema.safeParse(body);

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

    const { userId, reason } = validation.data;

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

    // Step 7: Apply rejection rules based on rejector role
    if (rejector.role === Role.ADMIN) {
      // Admin can only reject users from their own school
      if (targetUser.schoolId !== rejector.schoolId) {
        // Log unauthorized attempt
        await prisma.auditLog.create({
          data: {
            action: 'REJECTION_UNAUTHORIZED',
            entityType: 'USER',
            entityId: targetUser.id,
            userId: rejector.id,
            details: {
              rejectorRole: rejector.role,
              rejectorSchoolId: rejector.schoolId,
              targetUserSchoolId: targetUser.schoolId,
              targetUserRole: targetUser.role,
              reason: reason || 'No reason provided',
              violation: 'Cross-school rejection attempt',
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You can only reject users from your own school',
          },
          { status: 403 }
        );
      }

      // Admin cannot reject other ADMIN role users
      if (targetUser.role === Role.ADMIN) {
        // Log unauthorized attempt
        await prisma.auditLog.create({
          data: {
            action: 'REJECTION_UNAUTHORIZED',
            entityType: 'USER',
            entityId: targetUser.id,
            userId: rejector.id,
            details: {
              rejectorRole: rejector.role,
              targetUserRole: targetUser.role,
              reason: reason || 'No reason provided',
              violation: 'Admin cannot reject other admins',
            },
            ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
            userAgent: request.headers.get('user-agent') || 'unknown',
          },
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You cannot reject users with ADMIN role',
          },
          { status: 403 }
        );
      }
    }

    // Step 8: Reject the user
    const result = await rejectUser(
      targetUser.id,
      rejector.id,
      rejector.role,
      rejector.schoolId,
      reason
    );

    if (!result.success) {
      return NextResponse.json(
        { error: 'Rejection Failed', message: result.error },
        { status: 500 }
      );
    }

    // Step 9: Return success response
    return NextResponse.json({
      success: true,
      message: 'User rejected successfully',
      data: {
        userId: targetUser.id,
        email: targetUser.email,
        name: `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim(),
        role: targetUser.role,
        rejectedAt: result.rejectedAt,
        rejectedBy: {
          id: rejector.id,
          role: rejector.role,
        },
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('Rejection API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process rejection',
      },
      { status: 500 }
    );
  }
}
