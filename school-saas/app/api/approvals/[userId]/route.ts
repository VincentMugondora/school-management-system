import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { Role, UserStatus } from '@prisma/client';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * POST /api/approvals/{userId}
 *
 * Unified approval action endpoint.
 * Handles both APPROVE and REJECT actions for pending users.
 *
 * Payload: { action: 'APPROVE' | 'REJECT', reason?: string }
 *
 * Rules:
 * - Only ADMIN or SUPER_ADMIN can access
 * - Non-superadmin cannot approve/reject SUPERADMIN users
 * - Non-superadmin can only act on users in their own school
 * - Admin cannot approve other ADMIN role users
 *
 * @route app/api/approvals/[userId]/route.ts
 */

const approvalActionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reason: z.string().optional(),
});

interface RouteContext {
  params: Promise<{
    userId: string;
  }>;
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    // Get userId from route params
    const { userId: targetUserId } = await context.params;

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
        firstName: true,
        lastName: true,
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
      await logAuditEvent({
        userId: approver.id,
        action: 'APPROVAL_UNAUTHORIZED',
        entityType: 'USER',
        entityId: targetUserId,
        details: {
          approverRole: approver.role,
          reason: 'Non-admin attempted approval action',
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      });

      return NextResponse.json(
        { error: 'Forbidden', message: 'Only admins can approve or reject users' },
        { status: 403 }
      );
    }

    // Step 4: Parse and validate request body
    const body = await request.json();
    const validation = approvalActionSchema.safeParse(body);

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

    const { action, reason } = validation.data;

    // Step 5: Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        school: {
          select: {
            id: true,
            name: true,
          },
        },
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

    // Step 7: Apply authorization rules based on approver role
    if (approver.role !== Role.SUPER_ADMIN) {
      // Non-superadmin cannot approve/reject SUPERADMIN users
      if (targetUser.role === Role.SUPER_ADMIN) {
        await logAuditEvent({
          userId: approver.id,
          action: 'APPROVAL_UNAUTHORIZED',
          entityType: 'USER',
          entityId: targetUser.id,
          details: {
            approverRole: approver.role,
            targetUserRole: targetUser.role,
            action,
            reason: 'Non-superadmin attempted to act on SUPERADMIN user',
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          schoolId: approver.schoolId || undefined,
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You cannot approve or reject Super Administrator users',
          },
          { status: 403 }
        );
      }

      // Non-superadmin can only act on users from their own school
      if (targetUser.schoolId !== approver.schoolId) {
        await logAuditEvent({
          userId: approver.id,
          action: 'APPROVAL_UNAUTHORIZED',
          entityType: 'USER',
          entityId: targetUser.id,
          details: {
            approverRole: approver.role,
            approverSchoolId: approver.schoolId,
            targetUserSchoolId: targetUser.schoolId,
            targetUserRole: targetUser.role,
            action,
            reason: 'Cross-school approval attempt',
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          schoolId: approver.schoolId || undefined,
        });

        return NextResponse.json(
          {
            error: 'Forbidden',
            message: 'You can only approve or reject users from your own school',
          },
          { status: 403 }
        );
      }

      // Admin cannot approve other ADMIN role users
      if (action === 'APPROVE' && targetUser.role === Role.ADMIN) {
        await logAuditEvent({
          userId: approver.id,
          action: 'APPROVAL_UNAUTHORIZED',
          entityType: 'USER',
          entityId: targetUser.id,
          details: {
            approverRole: approver.role,
            targetUserRole: targetUser.role,
            action,
            reason: 'Admin cannot approve other admins',
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          schoolId: approver.schoolId || undefined,
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

    // Step 8: Perform the action
    const now = new Date();
    let updatedUser;

    if (action === 'APPROVE') {
      // Approve the user
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          status: UserStatus.APPROVED,
          approvedAt: now,
          approvedById: approver.id,
        },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Sync with Clerk
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUser(targetUser.clerkId, {
          publicMetadata: {
            status: UserStatus.APPROVED,
            approvedAt: now.toISOString(),
            approvedById: approver.id,
          },
        });
      } catch (clerkError) {
        console.error('Failed to sync approval with Clerk:', clerkError);
        // Don't fail the operation if Clerk sync fails
      }

      // Log approval
      await logAuditEvent({
        userId: approver.id,
        action: 'USER_APPROVED',
        entityType: 'USER',
        entityId: targetUser.id,
        details: {
          approverRole: approver.role,
          targetUserRole: targetUser.role,
          targetUserEmail: targetUser.email,
          targetUserSchoolId: targetUser.schoolId,
          targetUserSchoolName: targetUser.school?.name,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        schoolId: approver.schoolId || undefined,
      });
    } else {
      // Reject the user
      updatedUser = await prisma.user.update({
        where: { id: targetUserId },
        data: {
          status: UserStatus.REJECTED,
          approvedAt: now,
          approvedById: approver.id,
        },
        include: {
          school: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Sync with Clerk
      try {
        const clerk = await clerkClient();
        await clerk.users.updateUser(targetUser.clerkId, {
          publicMetadata: {
            status: UserStatus.REJECTED,
            rejectedAt: now.toISOString(),
            rejectedById: approver.id,
            rejectionReason: reason || null,
          },
        });
      } catch (clerkError) {
        console.error('Failed to sync rejection with Clerk:', clerkError);
      }

      // Log rejection
      await logAuditEvent({
        userId: approver.id,
        action: 'USER_REJECTED',
        entityType: 'USER',
        entityId: targetUser.id,
        details: {
          approverRole: approver.role,
          targetUserRole: targetUser.role,
          targetUserEmail: targetUser.email,
          targetUserSchoolId: targetUser.schoolId,
          targetUserSchoolName: targetUser.school?.name,
          reason: reason || null,
        },
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        schoolId: approver.schoolId || undefined,
      });
    }

    // Step 9: Return success response
    return NextResponse.json({
      success: true,
      message: `User ${action === 'APPROVE' ? 'approved' : 'rejected'} successfully`,
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        name: `${updatedUser.firstName || ''} ${updatedUser.lastName || ''}`.trim(),
        role: updatedUser.role,
        status: updatedUser.status,
        school: updatedUser.school,
        action,
        actionAt: now.toISOString(),
        actionBy: {
          id: approver.id,
          name: `${approver.firstName || ''} ${approver.lastName || ''}`.trim(),
          role: approver.role,
        },
        reason: reason || null,
      },
    });
  } catch (error) {
    console.error('Approval API Error:', error);

    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'Failed to process approval action',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper function to log audit events
 */
async function logAuditEvent({
  userId,
  action,
  entityType,
  entityId,
  details,
  ipAddress,
  userAgent,
  schoolId,
}: {
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  schoolId?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId,
        details,
        ipAddress,
        userAgent,
        schoolId,
      },
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging failure shouldn't break the operation
  }
}
