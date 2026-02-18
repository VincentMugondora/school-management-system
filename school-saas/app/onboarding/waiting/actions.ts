'use server';

import { prisma } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';

/**
 * Check User Approval Status
 *
 * Server action to check if a user has been approved.
 * Used by the waiting page for polling.
 *
 * @action app/onboarding/waiting/actions.ts
 */

export interface CheckUserApprovalResult {
  success: boolean;
  data?: {
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
    role: string;
    schoolName: string | null;
    requestedAt: string;
  };
  error?: string;
}

/**
 * Check the current user's approval status
 *
 * @returns CheckUserApprovalResult with status info or error
 */
export async function checkUserApproval(): Promise<CheckUserApprovalResult> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return {
        success: false,
        error: 'Not authenticated',
      };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        school: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: {
        status: user.status,
        role: user.role,
        schoolName: user.school?.name || null,
        requestedAt: user.createdAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error checking user approval:', error);
    return {
      success: false,
      error: 'Failed to check approval status',
    };
  }
}
